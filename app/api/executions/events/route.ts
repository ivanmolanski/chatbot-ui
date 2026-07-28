/**
 * SSE Proxy for Execution Events — Proxies to control plane SSE endpoint
 * with fallback to webhook event store.
 *
 * The control plane exposes SSE at /api/ui/v1/workflows/{id}/notes/events
 * This route forwards the connection with auth injection.
 * If control plane SSE is silent, falls back to polling webhook event store.
 */

import { NextRequest, NextResponse } from "next/server"
import { getEvents, storeEvent, StoredEvent } from "@/lib/execution-event-store"
import { cookies } from "next/headers"

const BACKEND_URL = process.env.AF_CONTROL_PLANE_URL!
const API_KEY = process.env.AF_API_KEY!

async function* proxyWithFallback(
  executionId: string,
  controlPlaneStream: ReadableStream<Uint8Array> | null,
  abortSignal: AbortSignal
): AsyncGenerator<string> {
  let lastEventId: string | undefined
  let controlPlaneExhausted = false
  let fallbackMode = false
  let lastEventTime = Date.now()
  const FALLBACK_TIMEOUT_MS = 5000 // Switch to fallback after 5 seconds of no events
  const POLLING_DEADLINE_MS = 5 * 60 * 1000 // Stop polling after 5 minutes wall-clock
  const pollingStartTime = Date.now()

  // First, try to read from control plane SSE
  if (controlPlaneStream) {
    const reader = controlPlaneStream.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (!abortSignal.aborted) {
        // Race the read against the inactivity deadline
        const readPromise = reader.read()
        let timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {}, 0)
        clearTimeout(timeoutId)
        const timeoutPromise = new Promise<{ done: true; value: undefined }>(
          (_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new DOMException("Inactivity timeout", "TimeoutError"))
            }, FALLBACK_TIMEOUT_MS)
          }
        )

        let result: { done: boolean; value: Uint8Array | undefined }
        try {
          result = await Promise.race([readPromise, timeoutPromise])
        } catch (e) {
          clearTimeout(timeoutId)
          if ((e as Error).name === "TimeoutError") {
            console.log(
              `[SSE Proxy] No events from control plane for ${FALLBACK_TIMEOUT_MS}ms, falling back to event store`
            )
            fallbackMode = true
            break
          }
          throw e
        } finally {
          clearTimeout(timeoutId)
        }

        const { done, value } = result
        if (done) {
          controlPlaneExhausted = true
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.replace(/\r$/, "")
          if (!trimmed.startsWith("data:")) continue
          const jsonStr = trimmed.slice(5).trimStart()
          if (!jsonStr || jsonStr === "[DONE]") continue

          try {
            const event = JSON.parse(jsonStr)
            // Track upstream CloudEvent ID for replay reconciliation
            if (event.id && typeof event.id === "string") {
              lastEventId = event.id
            }
            lastEventTime = Date.now()
            yield `data: ${jsonStr}\n\n`
          } catch {
            // Pass through non-JSON data
            lastEventTime = Date.now()
            yield `data: ${jsonStr}\n\n`
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.warn("[SSE Proxy] Control plane stream error, falling back:", e)
      }
      controlPlaneExhausted = true
    } finally {
      // Cancel the reader to stop upstream consumption
      await reader.cancel().catch(() => {})
      reader.releaseLock()
    }
  } else {
    // No control plane stream available, go straight to fallback
    controlPlaneExhausted = true
  }

  // Fallback: poll webhook event store
  if (controlPlaneExhausted || fallbackMode) {
    fallbackMode = true
    console.log(
      `[SSE Proxy] Falling back to event store polling for execution ${executionId}`
    )

    while (!abortSignal.aborted) {
      // Enforce wall-clock polling deadline
      if (Date.now() - pollingStartTime > POLLING_DEADLINE_MS) {
        console.log(
          `[SSE Proxy] Polling deadline reached for execution ${executionId}`
        )
        break
      }

      const events = getEvents(executionId, lastEventId)
      for (const event of events) {
        lastEventId = event.id
        lastEventTime = Date.now()
        const cloudEvent = {
          specversion: "1.0",
          id: event.id,
          type: event.type,
          source: event.source,
          time: event.time,
          executionid: event.executionId,
          data: event.data
        }
        yield `data: ${JSON.stringify(cloudEvent)}\n\n`

        // Stop polling after terminal events
        if (
          event.type === "execution_completed" ||
          event.type === "execution_failed"
        ) {
          console.log(
            `[SSE Proxy] Terminal event ${event.type} received, stopping polling`
          )
          return
        }
      }

      // Abort-aware delay
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(resolve, 2000)
          abortSignal.addEventListener(
            "abort",
            () => {
              clearTimeout(timeout)
              reject(new DOMException("Aborted", "AbortError"))
            },
            { once: true }
          )
        })
      } catch (e) {
        if ((e as Error).name === "AbortError") break
        throw e
      }
    }
  }
}

export async function GET(request: NextRequest) {
  const executionId = request.nextUrl.searchParams.get("execution_id")

  // Validate executionId is present
  if (!executionId) {
    return new NextResponse("Missing execution_id parameter", { status: 400 })
  }

  // Require authentication for SSE stream access - use session/cookie auth
  const cookieStore = await cookies()
  const sessionCookie =
    cookieStore.get("session")?.value || cookieStore.get("auth_token")?.value

  if (!sessionCookie) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // Use the correct endpoint: /api/ui/v1/workflows/{id}/notes/events
  const fullUrl = `${BACKEND_URL}/api/ui/v1/workflows/${executionId}/notes/events`

  const headers = new Headers()
  headers.set("Authorization", `Bearer ${API_KEY}`)
  headers.set("Accept", "text/event-stream")

  let controlPlaneStream: ReadableStream<Uint8Array> | null = null

  try {
    const response = await fetch(fullUrl, {
      method: "GET",
      headers,
      signal: request.signal
    })

    if (!response.ok) {
      // Log upstream error details server-side
      const errorText = await response.text().catch(() => response.statusText)
      console.error(
        `[SSE Proxy] Control plane error ${response.status}: ${errorText}`
      )
      // Return generic client-safe error
      return new NextResponse("Upstream error", { status: response.status })
    }

    controlPlaneStream = response.body
  } catch (e) {
    console.warn(
      "[SSE Proxy] Failed to connect to control plane, using event store only:",
      e
    )
    // Continue with fallback only
  }

  // Create SSE response with fallback
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      // Send initial connected event
      const connectedEvent = {
        specversion: "1.0",
        id: `evt_connected_${Date.now()}`,
        type: "connected",
        source: "chatbot-ui/sse-proxy",
        time: new Date().toISOString(),
        executionid: executionId,
        data: {
          message: "Execution events stream connected",
          timestamp: new Date().toISOString()
        }
      }
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(connectedEvent)}\n\n`)
      )

      // Keepalive timer
      const keepaliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"))
        } catch {
          // Controller closed, timer will be cleared in finally
        }
      }, 15000)

      try {
        for await (const chunk of proxyWithFallback(
          executionId,
          controlPlaneStream,
          request.signal
        )) {
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("[SSE Proxy] Stream error:", e)
        }
      } finally {
        clearInterval(keepaliveInterval)
        try {
          controller.close()
        } catch {
          // Controller may already be closed
        }
      }
    }
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  })
}

export const runtime = "nodejs"
