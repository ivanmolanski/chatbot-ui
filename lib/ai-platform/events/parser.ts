/**
 * CloudEvents Stream Parser
 *
 * Parses SSE streams into CloudEvents-compliant ExecutionEvent objects.
 * Handles: SSE format, JSON-lines, plain text fallback.
 */

import type { ExecutionEvent } from "./types"
import type { StreamChunk } from "../transport/types"

/**
 * Parse a stream of chunks into ExecutionEvents.
 * Yields events as they arrive.
 */
export async function* parseEventStream(
  chunks: AsyncIterable<StreamChunk>
): AsyncGenerator<ExecutionEvent> {
  let buffer = ""
  let currentEvent = ""

  for await (const chunk of chunks) {
    if (chunk.done) break

    const text = new TextDecoder().decode(chunk.data, { stream: true })
    buffer += text
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim()
      } else if (line.startsWith("data: ")) {
        const data = line.slice(6).trim()
        if (data === "[DONE]") return

        const event = normalizeEvent(currentEvent, data)
        if (event) yield event
        currentEvent = ""
      }
    }
  }
}

/**
 * Normalize a raw event into a CloudEvents-compliant ExecutionEvent.
 */
function normalizeEvent(
  eventType: string,
  data: string
): ExecutionEvent | null {
  const timestamp = new Date().toISOString()

  try {
    const parsed = JSON.parse(data)

    // If it's already a CloudEvents envelope, return as-is
    if (parsed.specversion && parsed.id && parsed.type) {
      return parsed as ExecutionEvent
    }

    // Otherwise, wrap it in a CloudEvents envelope
    return {
      specversion: "1.0",
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: eventType || parsed.type || "content.delta",
      source: "platform/unknown",
      time: timestamp,
      data: parsed,
      executionid: parsed.executionId,
      conversationid: parsed.conversationId
    }
  } catch {
    // Plain text — treat as content delta
    return {
      specversion: "1.0",
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: "content.delta",
      source: "platform/unknown",
      time: timestamp,
      data: { text: data, sequenceIndex: 0 }
    }
  }
}
