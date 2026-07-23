/**
 * Domain Model — The source of truth.
 *
 * Everything in the platform flows from these types.
 * The OpenAPI spec is generated from here. Not the other way around.
 */

// ── Identifiers ──────────────────────────────────────────────

export type ExecutionId = string
export type ConversationId = string

// ── Execution — The primary entity ───────────────────────────

export interface Execution {
  id: ExecutionId
  type: ExecutionType
  status: ExecutionStatus
  input: ExecutionInput
  config: ExecutionConfig
  conversationId: ConversationId
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  error?: PlatformError
  metadata: Record<string, unknown>
}

export type ExecutionType =
  | "chat"
  | "research"
  | "agent"
  | "workflow"
  | "planner"
  | "coder"
  | "vision"
  | "analysis"
  | "simulation"
  | string // Extensible — backend can add new types without API changes

export type ExecutionStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"

export interface ExecutionInput {
  content: string
  images?: string[]
  attachments?: FileAttachment[]
}

export interface ExecutionConfig {
  model?: string
  [key: string]: unknown // Type-specific config via discriminated union or extension
}

// ── Conversation — A view over executions ────────────────────

export interface Conversation {
  id: ConversationId
  title: string
  executionIds: ExecutionId[]
  createdAt: string
  updatedAt: string
  metadata: Record<string, unknown>
}

// ── Message — Derived from execution events ──────────────────

export interface Message {
  id: string
  conversationId: ConversationId
  executionId: ExecutionId
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  artifacts: Artifact[]
  citations: Citation[]
  metadata: Record<string, unknown>
}

// ── Artifact — Something an execution produces ───────────────

export interface Artifact {
  id: string
  type: string // Extensible: "code", "chart", "mindmap", etc.
  title?: string
  content: string
  language?: string
  metadata: Record<string, unknown>
}

// ── Citation — A source referenced during execution ──────────

export interface Citation {
  id: string
  url: string
  title: string
  source: string
  snippet?: string
  confidence?: number // 0-1
  accessedAt?: string
}

// ── File attachment ──────────────────────────────────────────

export interface FileAttachment {
  id: string
  name: string
  type: string // MIME type
  size: number
  url?: string
}

// ── Upload result ────────────────────────────────────────────

export interface UploadResult {
  id: string
  url: string
  name: string
  type: string
  size: number
}

// ── Platform capabilities ────────────────────────────────────

export interface PlatformCapabilities {
  executionTypes: string[]
  artifactTypes: string[]
  agents: string[]
  features: {
    streaming: boolean
    fileUpload: boolean
    conversations: boolean
    cancellations: boolean
    durableJobs: boolean
    reconnection: boolean
    [key: string]: boolean
  }
  protocol: {
    apiVersion: string
    eventVersion: string
    schemaVersion: string
    platformVersion: string
  }
}

// ── Platform errors ──────────────────────────────────────────

export interface PlatformError {
  code: string
  message: string
  details?: Record<string, unknown>
  retryable?: boolean
}

// ── Pagination ───────────────────────────────────────────────

export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  hasMore: boolean
}
