/**
 * AF Deep Research Backend Adapter
 *
 * Maps platform operations to AF Deep Research control plane API.
 * Translates AF SSE events → CloudEvents.
 */

import type { BackendAdapter } from "./types"
import type {
  Execution,
  Conversation,
  Message,
  PaginationParams,
  PaginatedResult,
  PlatformCapabilities,
  ExecutionId
} from "../domain/types"
import type { ExecuteParams } from "../client"
import type { ExecutionEvent } from "../events/types"

const CONTROL_PLANE_URL = process.env.AF_CONTROL_PLANE_URL!
const API_KEY = process.env.AF_API_KEY!

export class AFDeepResearchAdapter implements BackendAdapter {
  readonly backendType = "af-deep-research"

  async execute(params: ExecuteParams): Promise<Response> {
    // Map execute() → POST /api/v1/execute/{agent}.{reasoner}
    const target = `meta_deep_research.execute_deep_research`
    const url = `${CONTROL_PLANE_URL}/api/v1/execute/async/${target}`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
        Accept: "text/event-stream"
      },
      body: JSON.stringify({
        query: params.input.content,
        mode: (params.config?.mode as string) || "deep",
        research_focus: params.config?.researchFocus,
        research_scope: params.config?.researchScope,
        max_research_loops: params.config?.maxResearchLoops,
        num_parallel_streams: params.config?.parallelStreams,
        tension_lens: params.config?.tensionLens,
        source_strictness: params.config?.sourceStrictness,
        evidence_style: params.config?.evidenceStyle,
        analysis_depth: params.config?.analysisDepth,
        model: params.config?.model,
        api_key: params.config?.apiKey
      })
    })

    return response
  }

  async getExecution(executionId: string): Promise<Execution> {
    const response = await fetch(
      `${CONTROL_PLANE_URL}/api/v1/executions/${executionId}`,
      {
        headers: { "X-API-Key": API_KEY }
      }
    )
    const data = await response.json()
    return this.mapExecution(data)
  }

  async cancelExecution(executionId: string): Promise<void> {
    await fetch(
      `${CONTROL_PLANE_URL}/api/v1/executions/${executionId}/cancel`,
      {
        method: "POST",
        headers: { "X-API-Key": API_KEY }
      }
    )
  }

  async listConversations(
    params?: PaginationParams
  ): Promise<PaginatedResult<Conversation>> {
    const query = new URLSearchParams()
    if (params?.limit) query.set("limit", String(params.limit))
    if (params?.offset) query.set("offset", String(params.offset))

    const response = await fetch(
      `${CONTROL_PLANE_URL}/api/v1/conversations?${query}`,
      {
        headers: { "X-API-Key": API_KEY }
      }
    )
    const data = await response.json()
    return {
      items: (data.conversations || []).map(this.mapConversation),
      total: data.total || 0,
      hasMore: data.hasMore || false
    }
  }

  async getMessages(
    conversationId: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<Message>> {
    const query = new URLSearchParams()
    if (params?.limit) query.set("limit", String(params.limit))
    if (params?.offset) query.set("offset", String(params.offset))

    const response = await fetch(
      `${CONTROL_PLANE_URL}/api/v1/conversations/${conversationId}/messages?${query}`,
      {
        headers: { "X-API-Key": API_KEY }
      }
    )
    const data = await response.json()
    return {
      items: (data.messages || []).map(this.mapMessage),
      total: data.total || 0,
      hasMore: data.hasMore || false
    }
  }

  async getCapabilities(): Promise<PlatformCapabilities> {
    try {
      const response = await fetch(`${CONTROL_PLANE_URL}/api/v1/capabilities`, {
        headers: { "X-API-Key": API_KEY }
      })
      return response.json()
    } catch {
      // Fallback: return known capabilities
      return {
        executionTypes: ["chat", "research", "agent"],
        artifactTypes: ["code", "chart", "document"],
        agents: ["meta_deep_research"],
        features: {
          streaming: true,
          fileUpload: false,
          conversations: true,
          cancellations: true,
          durableJobs: false,
          reconnection: false
        },
        protocol: {
          apiVersion: "1.0.0",
          eventVersion: "1.0.0",
          schemaVersion: "1.0.0",
          platformVersion: "3.0.0"
        }
      }
    }
  }

  translateEvent(backendEvent: unknown): ExecutionEvent {
    const afEvent = backendEvent as Record<string, unknown>
    const timestamp = new Date().toISOString()
    const executionId = (afEvent.execution_id as string) || ""

    const typeMap: Record<string, string> = {
      token: "content.delta",
      thinking: "thinking.delta",
      status: "status.changed",
      progress: "progress.updated",
      search: "search.completed",
      citation: "citation.added",
      tool: "tool.output",
      error: "error",
      done: "execution.completed"
    }

    return {
      specversion: "1.0",
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: typeMap[afEvent.type as string] || "content.delta",
      source: `af-deep-research/execution/${executionId}`,
      time: timestamp,
      data: afEvent.data || afEvent,
      executionid: executionId
    }
  }

  private mapExecution(data: any): Execution {
    return {
      id: data.id || "",
      type: data.type || "research",
      status: data.status || "queued",
      input: { content: data.query || data.content || "" },
      config: data.config || {},
      conversationId: data.conversation_id || "",
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
      startedAt: data.started_at,
      completedAt: data.completed_at,
      error: data.error,
      metadata: data.metadata || {}
    }
  }

  private mapConversation(data: any): Conversation {
    return {
      id: data.id || "",
      title: data.title || "Untitled",
      executionIds: data.execution_ids || [],
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
      metadata: data.metadata || {}
    }
  }

  private mapMessage(data: any): Message {
    return {
      id: data.id || "",
      conversationId: data.conversation_id || "",
      executionId: data.execution_id || "",
      role: data.role || "assistant",
      content: data.content || "",
      timestamp: data.timestamp || new Date().toISOString(),
      artifacts: data.artifacts || [],
      citations: data.citations || [],
      metadata: data.metadata || {}
    }
  }
}
