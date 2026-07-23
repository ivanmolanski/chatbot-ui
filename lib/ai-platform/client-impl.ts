/**
 * AIPlatformClient Implementation
 *
 * Uses Transport + BackendAdapter to communicate with any backend.
 * The UI never knows which backend is being used.
 */

import type { AIPlatformClient, ExecuteParams } from "./client"
import type { Transport, ResponseWithHeaders } from "./transport/types"
import type { BackendAdapter } from "./adapters/types"
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
import { parseEventStream } from "./events/parser"

export class AIPlatformClientImpl implements AIPlatformClient {
  constructor(
    private transport: Transport,
    private adapter: BackendAdapter
  ) {}

  async *execute(params: ExecuteParams): AsyncGenerator<ExecutionEvent> {
    const response = await this.adapter.execute(params)
    if (!response.ok) {
      throw new Error(
        `Execute failed: ${response.status} ${response.statusText}`
      )
    }

    if (!response.body) {
      throw new Error("Response body is null")
    }

    const reader = response.body.getReader()
    const chunks = (async function* () {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          yield { data: value, done: false }
        }
        yield { data: new Uint8Array(0), done: true }
      } finally {
        reader.releaseLock()
      }
    })()

    for await (const event of parseEventStream(chunks)) {
      yield this.adapter.translateEvent(event)
    }
  }

  async getExecution(executionId: ExecutionId): Promise<Execution> {
    return this.adapter.getExecution(executionId)
  }

  async cancelExecution(executionId: ExecutionId): Promise<void> {
    return this.adapter.cancelExecution(executionId)
  }

  async listConversations(
    params?: PaginationParams
  ): Promise<PaginatedResult<Conversation>> {
    return this.adapter.listConversations(params)
  }

  async getConversation(id: ConversationId): Promise<Conversation> {
    const result = await this.adapter.listConversations()
    const conversation = result.items.find(c => c.id === id)
    if (!conversation) throw new Error(`Conversation ${id} not found`)
    return conversation
  }

  async renameConversation(
    id: ConversationId,
    title: string
  ): Promise<Conversation> {
    const result = await this.transport.request<Conversation>({
      method: "PUT",
      path: `/api/v1/conversations/${id}`,
      body: { title }
    })
    return result.data
  }

  async deleteConversation(id: ConversationId): Promise<void> {
    await this.transport.request({
      method: "DELETE",
      path: `/api/v1/conversations/${id}`
    })
  }

  async getMessages(
    conversationId: ConversationId,
    params?: PaginationParams
  ): Promise<PaginatedResult<Message>> {
    return this.adapter.getMessages(conversationId, params)
  }

  async uploadFile(
    file: File | Blob,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    const formData = new FormData()
    formData.append("file", file)

    const xhr = new XMLHttpRequest()
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener("progress", e => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      })
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText))
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      })
      xhr.addEventListener("error", () => reject(new Error("Upload failed")))
      xhr.open("POST", "/api/v1/upload")
      xhr.send(formData)
    })
  }

  async getCapabilities(): Promise<PlatformCapabilities> {
    return this.adapter.getCapabilities()
  }

  async healthCheck(): Promise<{ status: "ok" | "error"; latency?: number }> {
    const start = Date.now()
    try {
      const result = await this.transport.request({
        method: "GET",
        path: "/api/v1/health"
      })
      return { status: "ok", latency: Date.now() - start }
    } catch {
      return { status: "error", latency: Date.now() - start }
    }
  }
}
