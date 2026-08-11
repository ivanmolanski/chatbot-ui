/**
 * Webhook Endpoint — Receives observability events from AgentField control plane.
 *
 * The control plane forwards execution events (execution_updated, workflow_note_added,
 * execution_completed, execution_failed, etc.) to this endpoint.
 *
 * Per ARCHITECTURE.md Phase 4: CloudEvents streaming protocol.
 * Per ARCHITECTURE.md Phase 7: Durable jobs with event broadcasting.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  storeEvent,
  getEvents,
  StoredEvent,
  getStoreStats
} from "@/lib/execution-event-store"

const API_KEY = process.env.AGENTFIELD_API_KEY || process.env.AF_API_KEY

export function verifyApiKey(request: NextRequest): boolean {
  // Fail closed when API key is not configured
  if (!API_KEY) {
    console.log("[Webhook Auth] API_KEY not configured")
    return false
  }

  // Check headers first
  const xApiKey = request.headers.get("X-API-Key")
  const authHeader = request.headers.get("Authorization")
  const providedKey = xApiKey || authHeader?.replace("Bearer ", "")

  // Also check query parameter (for webhook URL with api_key param)
  const queryKey = request.nextUrl.searchParams.get("api_key")

  const keyToCheck = providedKey || queryKey
  if (!keyToCheck) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  if (keyToCheck.length !== API_KEY.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < keyToCheck.length; i++) {
    result |= keyToCheck.charCodeAt(i) ^ API_KEY.charCodeAt(i)
  }
  return result === 0
}

/**
 * Extract an execution ID from an event (CloudEvent or AgentField wire format),
 * checking top-level, nested data, and "exec_"-prefixed ids.
 */
function extractExecutionId(event: Record<string, any>): string | undefined {
  const candidates = [
    event.executionId,
    event.execution_id,
    event.data?.execution_id,
    event.data?.executionId,
    event.data?.run_id,
    event.data?.workflow_id,
    event.data?.execution?.id,
    event.data?.run?.id,
    event.data?.workflow?.id
  ]
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c
  }
  // Fallback: some events carry an id like "exec_abc123"
  if (typeof event.id === "string" && event.id.startsWith("exec_")) {
    return event.id
  }
  return undefined
}

export async function POST(request: NextRequest) {
  // Validate caller with API key (same mechanism as execution events route)
  if (!verifyApiKey(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()

    // The control plane sends BATCHED payloads:
    //   { batch_id, event_count, events: [ { event_type, event_source, timestamp, data }, ... ] }
    // Each event in the batch may itself look like a CloudEvent with type/source/time/data.
    // Normalize to a flat array BEFORE processing — previously the whole batch was treated
    // as a single event, so every execution_created/execution_completed event was skipped
    // with "Event missing execution ID" and SSE clients never saw progress.
    let rawEvents: unknown[]
    if (body && typeof body === "object" && Array.isArray((body as any).events)) {
      rawEvents = (body as any).events
    } else if (Array.isArray(body)) {
      rawEvents = body
    } else {
      rawEvents = [body]
    }

    console.log(
      `[Webhook] Received batch: ${rawEvents.length} event(s)`
    )

    const events: Record<string, any>[] = rawEvents.map((ev: any) => {
      if (ev && typeof ev === "object" && ev.event_type) {
        // AgentField wire format: { event_type, event_source, timestamp, data }
        return {
          ...ev,
          type: ev.event_type,
          source: ev.event_source || ev.source || "control-plane",
          time: ev.timestamp || ev.time || new Date().toISOString()
        }
      }
      return ev
    })

    for (const event of events) {
      // Extract execution ID from every plausible location:
      // top-level, nested data, and the AgentField event payload itself.
      const executionId = extractExecutionId(event)

      if (executionId) {
        const storedEvent: Omit<StoredEvent, "receivedAt"> = {
          id:
            event.id && event.id !== executionId
              ? event.id
              : `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          type: event.type || event.event_type || "unknown",
          source: event.source || event.event_source || "control-plane",
          time:
            event.time || event.timestamp || new Date().toISOString(),
          data: event.data || event,
          executionId
        }
        storeEvent(storedEvent)
        console.log(
          `[Webhook] Stored ${storedEvent.type} for ${executionId}`
        )
      } else {
        // system_state_snapshot and other node/system events don't carry an
        // execution id and are expected periodically — no per-event logging
        // to avoid flooding the log pipeline at >500 logs/sec.
      }
    }

    // Respond quickly to avoid "context deadline exceeded"
    return NextResponse.json({
      success: true,
      received: events.length,
      stored: events.filter((e) => !!extractExecutionId(e)).length
    })
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error)
    return NextResponse.json(
      { success: false, error: "Invalid payload" },
      { status: 400 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint for webhook verification
  const executionId = request.nextUrl.searchParams.get("execution_id")
  const afterId = request.nextUrl.searchParams.get("after")

  // Require authentication for event retrieval
  if (!verifyApiKey(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  if (executionId) {
    const events = getEvents(executionId, afterId || undefined)
    return NextResponse.json({ events })
  }

  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhook",
    description: "AgentField observability webhook endpoint",
    ...getStoreStats()
  })
}
