/**
 * BackendAdapter — Translates platform operations to backend-specific API calls.
 *
 * The UI never knows which backend is being used.
 * Today: AF Deep Research. Tomorrow: CrewAI, LangGraph, OpenAI, etc.
 */

import type {
  Execution,
  ExecutionId,
  ConversationId,
  Conversation,
  Message,
  PaginationParams,
  PaginatedResult,
  PlatformCapabilities
} from "../domain/types"
import type { ExecuteParams } from "../client"
import type { ExecutionEvent } from "../events/types"

export interface BackendAdapter {
  /**
   * The backend type identifier.
   */
  readonly backendType: string

  /**
   * Execute an operation on this backend.
   * Returns a Response with SSE stream.
   */
  execute(params: ExecuteParams): Promise<Response>

  /**
   * Get execution status from this backend.
   */
  getExecution(executionId: string): Promise<Execution>

  /**
   * Cancel an execution on this backend.
   */
  cancelExecution(executionId: string): Promise<void>

  /**
   * List conversations from this backend.
   */
  listConversations(
    params?: PaginationParams
  ): Promise<PaginatedResult<Conversation>>

  /**
   * Get messages from this backend.
   */
  getMessages(
    conversationId: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<Message>>

  /**
   * Get platform capabilities from this backend.
   */
  getCapabilities(): Promise<PlatformCapabilities>

  /**
   * Translate backend-specific events to platform events.
   */
  translateEvent(backendEvent: unknown): ExecutionEvent
}
