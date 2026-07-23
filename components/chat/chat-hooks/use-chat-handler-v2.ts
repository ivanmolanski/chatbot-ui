/**
 * Simplified Chat Handler — Uses AIPlatformClient
 *
 * This replaces the old useChatHandler which was tightly coupled to
 * Supabase, LLM providers, and provider-specific code.
 *
 * The new handler:
 * - Uses AIPlatformClient.execute() for all execution
 * - Uses client.listConversations() for conversation history
 * - Uses client.getMessages() for message retrieval
 * - Removes all LLM-specific logic
 * - Removes all Supabase dependencies
 */

"use client"

import { useState, useCallback, useRef } from "react"
import type { AIPlatformClient, ExecuteParams } from "@/lib/ai-platform/client"
import type { ExecutionEvent } from "@/lib/ai-platform/events/types"
import type { Conversation, Message } from "@/lib/ai-platform/domain/types"

interface ChatState {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  messages: Message[]
  isGenerating: boolean
  userInput: string
  activeExecutionId: string | null
  error: string | null
}

interface UseChatHandlerReturn {
  state: ChatState
  sendMessage: (
    content: string,
    type?: string,
    config?: Record<string, unknown>
  ) => Promise<void>
  selectConversation: (id: string) => Promise<void>
  createNewChat: () => void
  cancelExecution: () => Promise<void>
  setUserInput: (input: string) => void
}

export function useChatHandler(client: AIPlatformClient): UseChatHandlerReturn {
  const [state, setState] = useState<ChatState>({
    conversations: [],
    selectedConversation: null,
    messages: [],
    isGenerating: false,
    userInput: "",
    activeExecutionId: null,
    error: null
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (
      content: string,
      type: string = "chat",
      config: Record<string, unknown> = {}
    ) => {
      if (!content.trim()) return

      setState(prev => ({
        ...prev,
        isGenerating: true,
        error: null,
        userInput: ""
      }))

      // Add user message optimistically
      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        conversationId: state.selectedConversation?.id || "",
        executionId: "",
        role: "user",
        content,
        timestamp: new Date().toISOString(),
        artifacts: [],
        citations: [],
        metadata: {}
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage]
      }))

      try {
        const executeParams: ExecuteParams = {
          type,
          conversationId: state.selectedConversation?.id,
          input: { content },
          config
        }

        // Execute and stream events
        for await (const event of client.execute(executeParams)) {
          handleStreamEvent(event)
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : "Execution failed"
        }))
      } finally {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          activeExecutionId: null
        }))
      }
    },
    [client, state.selectedConversation]
  )

  const handleStreamEvent = useCallback((event: ExecutionEvent) => {
    switch (event.type) {
      case "content.delta":
        // Append text to the last assistant message
        setState(prev => {
          const messages = [...prev.messages]
          const lastMsg = messages[messages.length - 1]

          if (lastMsg?.role === "assistant") {
            lastMsg.content += (event.data as { text: string }).text
          } else {
            // Create new assistant message
            messages.push({
              id: `msg_${Date.now()}`,
              conversationId: prev.selectedConversation?.id || "",
              executionId: event.executionid || "",
              role: "assistant",
              content: (event.data as { text: string }).text,
              timestamp: event.time,
              artifacts: [],
              citations: [],
              metadata: {}
            })
          }

          return { ...prev, messages }
        })
        break

      case "execution.started":
        setState(prev => ({
          ...prev,
          activeExecutionId: (event.data as { executionId: string }).executionId
        }))
        break

      case "execution.completed":
        // Refresh conversation list
        loadConversations()
        break

      case "error":
        setState(prev => ({
          ...prev,
          error: (event.data as { message: string }).message
        }))
        break
    }
  }, [])

  const loadConversations = useCallback(async () => {
    try {
      const result = await client.listConversations({ limit: 50 })
      setState(prev => ({
        ...prev,
        conversations: result.items
      }))
    } catch (error) {
      console.error("Failed to load conversations:", error)
    }
  }, [client])

  const selectConversation = useCallback(
    async (id: string) => {
      try {
        const conversation = state.conversations.find(c => c.id === id)
        if (!conversation) return

        const result = await client.getMessages(id)
        setState(prev => ({
          ...prev,
          selectedConversation: conversation,
          messages: result.items
        }))
      } catch (error) {
        console.error("Failed to load messages:", error)
      }
    },
    [client, state.conversations]
  )

  const createNewChat = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedConversation: null,
      messages: [],
      error: null
    }))
  }, [])

  const cancelExecution = useCallback(async () => {
    if (state.activeExecutionId) {
      try {
        await client.cancelExecution(state.activeExecutionId)
        setState(prev => ({
          ...prev,
          isGenerating: false,
          activeExecutionId: null
        }))
      } catch (error) {
        console.error("Failed to cancel execution:", error)
      }
    }
  }, [client, state.activeExecutionId])

  const setUserInput = useCallback((input: string) => {
    setState(prev => ({ ...prev, userInput: input }))
  }, [])

  return {
    state,
    sendMessage,
    selectConversation,
    createNewChat,
    cancelExecution,
    setUserInput
  }
}
