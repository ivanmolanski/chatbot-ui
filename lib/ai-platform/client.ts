/**
 * AIPlatformClient — The ONLY interface the UI uses.
 *
 * Generated from the domain model, NOT from OpenAPI.
 * Every React component imports this. Nothing else.
 */

import type {
  Execution,
  ExecutionId,
  ConversationId,
  Conversation,
  Message,
  PaginationParams,
  PaginatedResult,
  PlatformCapabilities,
  UploadResult
} from "./domain/types"
import type { ExecutionEvent } from "./events/types"

export interface ExecuteParams {
  type: string
  conversationId?: ConversationId
  input: {
    content: string
    images?: string[]
    attachments?: {
      id: string
      name: string
      type: string
      size: number
      url?: string
    }[]
  }
  config?: Record<string, unknown>
}

export interface AIPlatformClient {
  // ── EXECUTION (the primary operation) ──
  execute(params: ExecuteParams): AsyncIterable<ExecutionEvent>
  getExecution(executionId: ExecutionId): Promise<Execution>
  cancelExecution(executionId: ExecutionId): Promise<void>

  // ── CONVERSATIONS (a view over executions) ──
  listConversations(
    params?: PaginationParams
  ): Promise<PaginatedResult<Conversation>>
  getConversation(id: ConversationId): Promise<Conversation>
  renameConversation(id: ConversationId, title: string): Promise<Conversation>
  deleteConversation(id: ConversationId): Promise<void>
  getMessages(
    conversationId: ConversationId,
    params?: PaginationParams
  ): Promise<PaginatedResult<Message>>

  // ── FILES ──
  uploadFile(
    file: File | Blob,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult>

  // ── CAPABILITIES ──
  getCapabilities(): Promise<PlatformCapabilities>

  // ── HEALTH ──
  healthCheck(): Promise<{ status: "ok" | "error"; latency?: number }>
}
