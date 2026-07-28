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

const API_KEY = process.env.AF_API_KEY

export function verifyApiKey(request: NextRequest): boolean {
  // Fail closed when API key is not configured
  if (!API_KEY) return false

  // Check headers first
  const providedKey =
    request.headers.get("X-API-Key") ||
    request.headers.get("Authorization")?.replace("Bearer ", "")

  // Also check query parameter (for webhook URL with api_key param)
  const queryKey = request.nextUrl.searchParams.get("api_key")

  const keyToCheck = providedKey || queryKey
  if (!keyToCheck) return false

  // Constant-time comparison to prevent timing attacks
  if (keyToCheck.length !== API_KEY.length) return false
  let result = 0
  for (let i = 0; i < keyToCheck.length; i++) {
    result |= keyToCheck.charCodeAt(i) ^ API_KEY.charCodeAt(i)
  }
  return result === 0
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

    // Log the incoming webhook for debugging
    console.log("[Webhook] Received event:", JSON.stringify(body, null, 2))

    // The control plane sends CloudEvents format
    // We need to extract execution_id and store for SSE clients
    const events = Array.isArray(body) ? body : [body]

    for (const event of events) {
      // Extract execution ID from various possible locations
      // Order: top-level executionId (camelCase), execution_id (snake_case), then nested data fields
      const executionId =
        event.executionId ||
        event.execution_id ||
        event.data?.execution_id ||
        event.data?.executionId ||
        event.data?.run_id ||
        event.data?.workflow_id

      if (executionId) {
        const storedEvent: Omit<StoredEvent, "receivedAt"> = {
          id:
            event.id ||
            `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          type: event.type || "unknown",
          source: event.source || "control-plane",
          time: event.time || new Date().toISOString(),
          data: event.data || event,
          executionId
        }
        storeEvent(storedEvent)
        console.log(
          `[Webhook] Stored event ${storedEvent.type} for execution ${executionId}`
        )
      } else {
        console.warn(
          "[Webhook] Event missing execution ID, skipping:",
          event.type
        )
      }
    }

    // Respond quickly to avoid "context deadline exceeded"
    return NextResponse.json({ success: true, received: events.length })
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
