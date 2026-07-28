/**
 * Shared Execution Event Store
 *
 * Single source of truth for execution events shared between:
 * - app/api/executions/events/route.ts (SSE proxy)
 * - app/api/webhook/route.ts (webhook receiver)
 *
 * In production, this would be Redis or a message queue.
 */

// Event stored in the event store
export interface StoredEvent {
  id: string
  type: string
  source: string
  time: string
  data: Record<string, unknown>
  executionId?: string
  receivedAt: number // Server-side timestamp for reliable cleanup
}

// Global event store (shared across module evaluations)
declare global {
  var executionEventStore: Map<string, StoredEvent[]> | undefined
  var executionEventStoreCleanupTimer:
    ReturnType<typeof setInterval> | undefined
}

const eventStore =
  globalThis.executionEventStore || new Map<string, StoredEvent[]>()
globalThis.executionEventStore = eventStore

const MAX_EVENTS_PER_EXECUTION = 1000
const EVENT_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_TRACKED_EXECUTIONS = 10000 // Prevent unbounded growth

/**
 * Initialize cleanup timer (idempotent - safe to call multiple times)
 */
function ensureCleanupTimer(): void {
  if (globalThis.executionEventStoreCleanupTimer) return

  const timer = setInterval(() => {
    const now = Date.now()
    for (const [executionId, events] of eventStore.entries()) {
      const filtered = events.filter(e => now - e.receivedAt < EVENT_TTL_MS)
      if (filtered.length === 0) {
        eventStore.delete(executionId)
      } else {
        eventStore.set(executionId, filtered)
      }
    }
    // Enforce max tracked executions cap
    if (eventStore.size > MAX_TRACKED_EXECUTIONS) {
      const entries = Array.from(eventStore.entries())
      // Remove oldest by receivedAt of first event
      entries.sort((a, b) => a[1][0]?.receivedAt - b[1][0]?.receivedAt)
      const toRemove = entries.slice(
        0,
        eventStore.size - MAX_TRACKED_EXECUTIONS
      )
      for (const [id] of toRemove) {
        eventStore.delete(id)
      }
    }
  }, 60000)

  // Allow process to exit even if timer is running
  if (timer.unref) timer.unref()
  globalThis.executionEventStoreCleanupTimer = timer
}

// Initialize on module load
ensureCleanupTimer()

/**
 * Store an event for an execution
 * Enforces max tracked-execution count synchronously on new key insertion
 */
export function storeEvent(event: Omit<StoredEvent, "receivedAt">): void {
  const executionId =
    event.executionId ||
    (event.data.execution_id as string) ||
    (event.data.executionId as string)
  if (!executionId) return

  const storedEvent: StoredEvent = {
    ...event,
    receivedAt: Date.now()
  }

  // Enforce max tracked-execution count synchronously on new key insertion
  if (
    !eventStore.has(executionId) &&
    eventStore.size >= MAX_TRACKED_EXECUTIONS
  ) {
    // Remove oldest entries to make room
    const entries = Array.from(eventStore.entries())
    entries.sort((a, b) => a[1][0]?.receivedAt - b[1][0]?.receivedAt)
    const toRemove = entries.slice(
      0,
      Math.max(1, Math.floor(MAX_TRACKED_EXECUTIONS * 0.1))
    )
    for (const [id] of toRemove) {
      eventStore.delete(id)
    }
  }

  const events = eventStore.get(executionId) || []
  events.push(storedEvent)
  if (events.length > MAX_EVENTS_PER_EXECUTION) {
    events.shift()
  }
  eventStore.set(executionId, events)
}

/**
 * Get events for an execution, optionally after a cursor
 * Returns empty array if afterId is unknown (not found)
 */
export function getEvents(
  executionId: string,
  afterId?: string
): StoredEvent[] {
  const events = eventStore.get(executionId) || []
  if (!afterId) return events
  const index = events.findIndex(e => e.id === afterId)
  return index >= 0 ? events.slice(index + 1) : []
}

/**
 * Get store statistics for health checks
 */
export function getStoreStats(): {
  totalExecutions: number
  totalEvents: number
  oldestEventAgeMs: number | null
} {
  const now = Date.now()
  let totalEvents = 0
  let oldestEventAgeMs: number | null = null

  for (const [, events] of eventStore.entries()) {
    totalEvents += events.length
    for (const event of events) {
      const age = now - event.receivedAt
      if (oldestEventAgeMs === null || age > oldestEventAgeMs) {
        oldestEventAgeMs = age
      }
    }
  }

  return {
    totalExecutions: eventStore.size,
    totalEvents,
    oldestEventAgeMs
  }
}

/**
 * Get all tracked execution IDs (for debugging/monitoring)
 */
export function getTrackedExecutions(): string[] {
  return Array.from(eventStore.keys())
}
