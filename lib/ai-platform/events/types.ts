/**
 * CloudEvents Streaming Protocol
 *
 * Uses the CNCF CloudEvents specification.
 * https://cloudevents.io/
 *
 * Every event is an ExecutionEvent with a typed data payload.
 * NOT a giant union. Each data type is independent and extensible.
 */

// ── CloudEvents Envelope ─────────────────────────────────────

export interface ExecutionEvent<T = unknown> {
  /** CloudEvents spec version */
  specversion: "1.0"

  /** Unique event ID */
  id: string

  /** Event type — dot-separated, hierarchical */
  type: string

  /** Event source (e.g., "af-deep-research/execution/{id}") */
  source: string

  /** Event timestamp (ISO 8601) */
  time: string

  /** The data payload — typed per event type */
  data: T

  /** Extension attributes */
  datacontenttype?: string
  executionid?: string
  conversationid?: string
}

// ── Event Data Types ─────────────────────────────────────────

export interface ExecutionStartedData {
  executionId: string
  type: string
  conversationId: string
}

export interface ExecutionCompletedData {
  executionId: string
  conversationId: string
  messageCount: number
  totalTokens?: number
  totalDuration?: number
}

export interface ExecutionFailedData {
  executionId: string
  error: { code: string; message: string; retryable?: boolean }
}

export interface StatusChangedData {
  status: string
  message?: string
}

export interface ProgressUpdatedData {
  progress: number
  currentStep: string
  estimatedTimeRemaining?: number
}

export interface ContentDeltaData {
  text: string
  sequenceIndex: number
}

export interface ThinkingData {
  text: string
}

export interface SearchData {
  query: string
  results: Array<{ url: string; title: string; snippet: string }>
}

export interface ToolData {
  toolName: string
  status: string
  progress?: number
  output?: string
}

export interface ArtifactData {
  artifact: {
    id: string
    type: string
    title?: string
    content: string
    language?: string
    metadata: Record<string, unknown>
  }
}

export interface CitationData {
  citation: {
    id: string
    url: string
    title: string
    source: string
    snippet?: string
    confidence?: number
  }
}

export interface ErrorData {
  code: string
  message: string
  details?: Record<string, unknown>
  retryable?: boolean
}

// ── Type registry for type-safe event handling ────────────────

export interface EventTypeMap {
  "execution.started": ExecutionStartedData
  "execution.completed": ExecutionCompletedData
  "execution.failed": ExecutionFailedData
  "execution.cancelled": Record<string, never>
  "status.changed": StatusChangedData
  "progress.updated": ProgressUpdatedData
  "thinking.delta": ThinkingData
  "search.completed": SearchData
  "tool.output": ToolData
  "content.delta": ContentDeltaData
  "content.artifact": ArtifactData
  "citation.added": CitationData
  error: ErrorData
  [key: string]: unknown // Extensible — new events don't break the type system
}
