/**
 * ReconnectableStream — Auto-reconnect with resume.
 *
 * If the connection drops, it reconnects and resumes from the last event.
 * Exponential backoff with jitter.
 */

import type { Transport } from "../transport/types"
import type { ExecutionEvent } from "./types"
import { parseEventStream } from "./parser"

export class ReconnectableStream {
  private lastEventId: string | null = null
  private retryCount = 0
  private maxRetries = 10
  private baseDelay = 1000

  async *subscribe(
    transport: Transport,
    jobId: string
  ): AsyncGenerator<ExecutionEvent> {
    while (this.retryCount < this.maxRetries) {
      try {
        const chunks = transport.stream({
          method: "GET",
          path: `/api/v1/jobs/${jobId}/events`,
          query: this.lastEventId ? { after: this.lastEventId } : undefined
        })

        for await (const event of parseEventStream(chunks)) {
          this.lastEventId = event.id
          this.retryCount = 0 // Reset on successful receive
          yield event
        }

        return // Stream completed normally
      } catch (error) {
        this.retryCount++
        const delay = this.baseDelay * Math.pow(2, this.retryCount)
        const jitter = delay * 0.1 * Math.random()
        await new Promise(resolve => setTimeout(resolve, delay + jitter))
      }
    }
  }

  reset(): void {
    this.lastEventId = null
    this.retryCount = 0
  }
}
