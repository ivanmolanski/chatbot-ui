/**
 * SSE Proxy for Execution Events — per arch2.md §2.2 / §5.
 *
 * Phase 1: Streams CloudEvents from control plane SSE with keepalive pings.
 *          Falls through after control plane closes, errors, or 30 s inactivity.
 * Phase 2: Polls the shared event store (populated by webhook) for up to 5 min.
 *
 * Ref: arch2.md — "SSE Proxy with Fallback" and "Progress-Reading Flow (Fixed Cancellation)"
 */

import { NextRequest, NextResponse } from "next/server"
import { getEvents } from "@/lib/execution-event-store"

const KEEPALIVE_MS = 15_000
const INACTIVITY_MS = 30_000 // control plane may be silent for 10s+ between events
const POLL_INTERVAL_MS = 2_000
const POLL_DEADLINE_MS = 5 * 60 * 1_000 // 5 min, counted from fallback start

function abortAwareDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }
    const onAbort = () => {
      clearTimeout(t)
      reject(new DOMException("Aborted", "AbortError"))
    }
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

export async function GET(request: NextRequest) {
  const BACKEND_URL =
    process.env.AF_CONTROL_PLANE_URL || process.env.CONTROL_PLANE_URL
  const API_KEY = process.env.AGENTFIELD_API_KEY || process.env.AF_API_KEY

  if (!BACKEND_URL || !API_KEY) {
    console.error(
      "[SSE Proxy] Missing AF_CONTROL_PLANE_URL or AGENTFIELD_API_KEY"
    )
    return new NextResponse("Server configuration error", { status: 500 })
  }

  const rawExecutionId = request.nextUrl.searchParams.get("execution_id")
  if (!rawExecutionId)
    return new NextResponse("Missing execution_id parameter", { status: 400 })
  if (!/^[a-zA-Z0-9_-]+$/.test(rawExecutionId))
    return new NextResponse("Invalid execution_id format", { status: 400 })

  const executionId = rawExecutionId
  const reconnectEventId = request.headers.get("Last-Event-ID") ?? undefined
  const base = BACKEND_URL.replace(/\/+$/, "")
  const upstreamUrl = `${base}/api/ui/v1/workflows/${encodeURIComponent(executionId)}/notes/events`
  const abortSignal = request.signal
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      let keepaliveTimer: ReturnType<typeof setInterval> | null = null

      const clearKeepalive = (): void => {
        if (keepaliveTimer !== null) {
          clearInterval(keepaliveTimer)
          keepaliveTimer = null
        }
      }

      const send = (text: string): void => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(text))
        } catch {
          closed = true
          clearKeepalive()
        }
      }

      const close = (): void => {
        if (closed) return
        closed = true
        clearKeepalive()
        try {
          controller.close()
        } catch {}
      }

      abortSignal.addEventListener("abort", close, { once: true })
      keepaliveTimer = setInterval(() => send(": ping\n\n"), KEEPALIVE_MS)

      // ── Phase 1: Upstream control plane SSE ─────────────────────────────
      let lastEventId: string | undefined = reconnectEventId

      try {
        const upstreamHeaders = new Headers({
          Authorization: `Bearer ${API_KEY}`,
          Accept: "text/event-stream",
          ...(lastEventId ? { "Last-Event-ID": lastEventId } : {})
        })

        const response = await fetch(upstreamUrl, {
          method: "GET",
          headers: upstreamHeaders,
          signal: abortSignal
        })

        if (!response.ok || !response.body) {
          console.error(
            `[SSE Proxy] Control plane ${response.status} — falling back to event store`
          )
        } else {
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ""
          // State persists across chunks so events split over multiple reads are assembled correctly
          let dataLines: string[] = []
          let currentId: string | undefined
          let currentType = "message"

          try {
            while (!abortSignal.aborted && !closed) {
              let timerHandle: ReturnType<typeof setTimeout> | undefined

              const chunk = await Promise.race([
                reader.read(),
                new Promise<never>(
                  (_, reject) =>
                    (timerHandle = setTimeout(
                      () =>
                        reject(
                          new DOMException(
                            "Inactivity timeout",
                            "TimeoutError"
                          )
                        ),
                      INACTIVITY_MS
                    ))
                )
              ]).finally(() => {
                if (timerHandle !== undefined) clearTimeout(timerHandle)
              })

              if (chunk.done) break

              buffer += decoder.decode(chunk.value, { stream: true })

              // WHATWG-compliant SSE parser (handles CRLF and LF)
              const lines = buffer.split(/\r?\n/)
              buffer = lines.pop() ?? ""

              for (const line of lines) {
                const raw = line.replace(/\r$/, "")

                if (raw === "") {
                  // Event boundary — dispatch buffered event
                  if (dataLines.length > 0) {
                    const payload = dataLines.join("\n")
                    if (payload !== "[DONE]") {
                      if (currentId) send(`id: ${currentId}\n`)
                      if (currentType !== "message")
                        send(`event: ${currentType}\n`)
                      send(`data: ${payload}\n\n`)
                      if (currentId) lastEventId = currentId
                    }
                  }
                  dataLines = []
                  currentId = undefined
                  currentType = "message"
                  continue
                }

                if (raw.startsWith(":")) continue // SSE comment / keepalive

                const colonAt = raw.indexOf(":")
                if (colonAt < 0) continue

                const field = raw.slice(0, colonAt)
                const value = raw.slice(colonAt + 1).replace(/^ /, "")

                if (field === "data") dataLines.push(value)
                else if (field === "id") currentId = value
                else if (field === "event") currentType = value
                else if (field === "retry") {
                  const ms = parseInt(value, 10)
                  if (!isNaN(ms)) send(`retry: ${ms}\n\n`)
                }
              }
            }
          } catch (e) {
            const name = (e as DOMException).name
            if (name !== "AbortError" && name !== "TimeoutError") {
              console.warn(
                "[SSE Proxy] Upstream read error:",
                (e as Error).message
              )
            }
            // Both TimeoutError (inactivity) and other errors fall through to polling
          } finally {
            // CRITICAL: stop upstream consumption regardless of how we exited
            await reader.cancel().catch(() => {})
            reader.releaseLock()
          }
        }
      } catch (e) {
        if ((e as DOMException).name !== "AbortError") {
          console.error("[SSE Proxy] Fetch error:", (e as Error).message)
        }
      }

      // ── Phase 2: Fallback polling from shared event store ────────────────
      // Deadline starts HERE (not at stream start) per arch2.md
      const pollDeadline = Date.now() + POLL_DEADLINE_MS
      let pollCursor = lastEventId

      while (!abortSignal.aborted && !closed && Date.now() < pollDeadline) {
        const newEvents = getEvents(executionId, pollCursor)

        for (const event of newEvents) {
          // Reconstruct full CloudEvent so chat handler receives the same shape as phase 1
          const cloudEvent = {
            id: event.id,
            type: event.type,
            source: event.source,
            time: event.time,
            data: event.data
          }
          if (event.id) send(`id: ${event.id}\n`)
          if (event.type && event.type !== "message") send(`event: ${event.type}\n`)
          send(`data: ${JSON.stringify(cloudEvent)}\n\n`)
          if (event.id) pollCursor = event.id
        }

        if (
          newEvents.some(
            e =>
              e.type === "execution.completed" || e.type === "execution.failed"
          )
        )
          break

        try {
          await abortAwareDelay(POLL_INTERVAL_MS, abortSignal)
        } catch {
          break
        }
      }

      close()
    }
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  })
}

export const runtime = "nodejs"
