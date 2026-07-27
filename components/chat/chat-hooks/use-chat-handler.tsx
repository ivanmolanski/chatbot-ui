/**
 * Chat Handler — Uses AIPlatformClient for all execution.
 * Replaces the old handler that was coupled to Supabase, DB, and LLM providers.
 * Per ARCHITECTURE.md Phase 2: execute() is the single entry point.
 */

import { ChatbotUIContext } from "@/context/context"
import { ChatMessage } from "@/types"
import { useRouter } from "next/navigation"
import { useContext, useEffect, useRef } from "react"

export const useChatHandler = () => {
  const router = useRouter()

  const {
    userInput,
    setUserInput,
    setIsGenerating,
    setChatMessages,
    setFirstTokenReceived,
    selectedChat,
    selectedWorkspace,
    setSelectedChat,
    setChats,
    setSelectedTools,
    abortController,
    setAbortController,
    chatSettings,
    newMessageImages,
    setNewMessageImages,
    selectedAssistant,
    chatMessages,
    chatImages,
    setChatImages,
    setChatFiles,
    setNewMessageFiles,
    setShowFilesDisplay,
    newMessageFiles,
    chatFileItems,
    setChatFileItems,
    setToolInUse,
    useRetrieval,
    sourceCount,
    setIsPromptPickerOpen,
    setIsFilePickerOpen,
    selectedTools,
    selectedPreset,
    setChatSettings,
    models,
    isPromptPickerOpen,
    isFilePickerOpen,
    isToolPickerOpen
  } = useContext(ChatbotUIContext)

  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isPromptPickerOpen || !isFilePickerOpen || !isToolPickerOpen) {
      chatInputRef.current?.focus()
    }
  }, [isPromptPickerOpen, isFilePickerOpen, isToolPickerOpen])

  const handleNewChat = async () => {
    if (!selectedWorkspace) return

    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)
    setChatFileItems([])

    setIsGenerating(false)
    setFirstTokenReceived(false)

    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setShowFilesDisplay(false)
    setIsPromptPickerOpen(false)
    setIsFilePickerOpen(false)

    setSelectedTools([])
    setToolInUse("none")

    return router.push(`/${selectedWorkspace.id}/chat`)
  }

  const handleFocusChatInput = () => {
    chatInputRef.current?.focus()
  }

  const handleStopMessage = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const handleSendMessage = async (
    messageContent: string,
    chatMessages: ChatMessage[],
    isRegeneration: boolean
  ) => {
    const startingInput = messageContent

    // Helper to stringify result (string or object) preserving existing behavior
    const stringifyResult = (result: unknown): string =>
      typeof result === "string" ? result : JSON.stringify(result, null, 2)

    try {
      setUserInput("")
      setIsGenerating(true)
      setToolInUse("none")
      setIsPromptPickerOpen(false)
      setIsFilePickerOpen(false)
      setNewMessageImages([])

      const newAbortController = new AbortController()
      setAbortController(newAbortController)

      // AF Deep Research: POST /api/v1/execute/async/{agent}.{reasoner}
      // Backend expects: {"input": {"query": "..."}}
      // Returns JSON with execution_id, then we connect to SSE at /api/v1/executions/events
      const executeResponse = await fetch(
        "/api/v1/execute/async/meta_deep_research.execute_deep_research",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            input: { query: messageContent }
          }),
          signal: newAbortController.signal
        }
      )

      if (!executeResponse.ok) {
        const errorText = await executeResponse
          .text()
          .catch(() => executeResponse.statusText)
        throw new Error(
          `Execution failed (${executeResponse.status}): ${errorText}`
        )
      }

      const executeData = await executeResponse.json()
      const executionId =
        executeData.execution_id ||
        executeData.run_id ||
        executeData.workflow_id

      if (!executionId) {
        throw new Error("No execution ID returned from backend")
      }

      // Now connect to SSE stream for execution events
      // Use the proxy endpoint which injects auth, filter by execution_id
      const sseUrl = `/api/executions/events?execution_id=${encodeURIComponent(executionId)}`
      const sseResponse = await fetch(sseUrl, {
        headers: {
          Accept: "text/event-stream"
        },
        signal: newAbortController.signal
      })

      if (!sseResponse.ok) {
        const errorText = await sseResponse
          .text()
          .catch(() => sseResponse.statusText)
        throw new Error(
          `SSE connection failed (${sseResponse.status}): ${errorText}`
        )
      }

      // Stream SSE response from AF backend
      if (sseResponse.body) {
        const reader = sseResponse.body.getReader()
        const decoder = new TextDecoder()
        let thinkingText = ""
        let responseText = ""
        let buffer = ""
        let shouldExitLoop = false

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })

            // Process SSE events (lines starting with "data: ")
            const lines = buffer.split("\n")
            buffer = lines.pop() || "" // Keep incomplete line in buffer

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue
              const jsonStr = line.slice(6).trim()
              if (!jsonStr || jsonStr === "[DONE]") continue

              let event: any
              try {
                event = JSON.parse(jsonStr)
              } catch {
                // Only handle JSON parse errors - treat as plain text delta
                if (jsonStr) {
                  responseText += jsonStr
                  setFirstTokenReceived(true)
                }
                continue
              }

              // AF events have a "type" field and "data" payload
              const eventType = event.type || ""
              const eventData = event.data || event

              // Filter events by execution_id - only process events for our execution
              const eventExecutionId =
                eventData.execution_id ||
                event.executionid ||
                event.execution_id
              if (eventExecutionId && eventExecutionId !== executionId) {
                continue // Skip events for other executions
              }

              // Handle control plane SSE events (CloudEvents format)
              if (eventType === "execution_updated") {
                // Execution status update - extract note/message if present
                const status = eventData.status || ""
                if (status) setToolInUse(status)
              } else if (eventType === "workflow_note_added") {
                // Progress notes from the agent
                const note = eventData.note?.message || eventData.message || ""
                if (note) {
                  setToolInUse(note)
                  // Also append to response text for visibility
                  responseText += `\n\n${note}`
                  setFirstTokenReceived(true)
                }
              } else if (
                eventType === "execution_completed" ||
                eventType === "execution.failed"
              ) {
                // Separate failure from success: only process results for completion
                if (eventType === "execution.failed") {
                  // Cancel the reader before propagating the error
                  reader.cancel().catch(() => {})
                  throw new Error(eventData.message || "Research failed")
                }
                // Fetch the full execution details to get the result
                // Use the normalized eventExecutionId which handles all fallback fields
                const resultExecutionId =
                  eventExecutionId || eventData.execution_id
                if (resultExecutionId) {
                  try {
                    // Create a timeout controller for the fetch
                    const fetchController = new AbortController()
                    const timeoutId = setTimeout(
                      () => fetchController.abort(),
                      10000
                    )

                    const execResponse = await fetch(
                      `/api/v1/executions/${resultExecutionId}`,
                      {
                        headers: { Accept: "application/json" },
                        // Combine both abort signals
                        signal: AbortSignal.any([
                          newAbortController.signal,
                          fetchController.signal
                        ])
                      }
                    )
                    clearTimeout(timeoutId)

                    if (execResponse.ok) {
                      const execData = await execResponse.json()
                      if (execData.result) {
                        responseText = stringifyResult(execData.result)
                      } else if (execData.document?.sections) {
                        responseText = execData.document.sections.join("\n\n")
                      }
                    } else {
                      throw new Error(
                        `Failed to fetch execution: ${execResponse.status}`
                      )
                    }
                  } catch (e) {
                    if ((e as Error).name === "AbortError") {
                      // Distinguish between user cancellation and fetch timeout
                      if (newAbortController.signal.aborted) {
                        throw e // User cancelled
                      }
                      throw new Error("Execution result fetch timed out")
                    }
                    console.error("Failed to fetch execution result:", e)
                    throw new Error("Failed to fetch execution result")
                  }
                } else if (eventData.result) {
                  responseText = stringifyResult(eventData.result)
                } else if (eventData.document?.sections) {
                  responseText = eventData.document.sections.join("\n\n")
                }
                // Mark first token received when we have response text
                if (responseText) {
                  setFirstTokenReceived(true)
                }
                // Cancel the reader after successful completion - we have the result
                reader.cancel().catch(() => {})
                shouldExitLoop = true
                break // Exit the SSE read loop
              } else if (eventType === "error") {
                // Cancel the reader before propagating the error
                reader.cancel().catch(() => {})
                throw new Error(eventData.message || "Research failed")
              }
              // Handle legacy/direct agent events
              else if (eventType === "token" || eventType === "content.delta") {
                const text = eventData.text || eventData.content || ""
                if (text) {
                  responseText += text
                  setFirstTokenReceived(true)
                }
              } else if (
                eventType === "thinking" ||
                eventType === "thinking.delta"
              ) {
                const thinkText = eventData.text || eventData.content || ""
                if (thinkText) {
                  thinkingText += thinkText
                }
              } else if (
                eventType === "status" ||
                eventType === "status.changed"
              ) {
                const msg = eventData.message || eventData.status || ""
                if (msg) setToolInUse(msg)
              } else if (
                eventType === "progress" ||
                eventType === "progress.updated"
              ) {
                const step = eventData.currentStep || eventData.step || ""
                if (step) setToolInUse(step)
              }
            }

            // Compute fullText from accumulators
            const fullText = thinkingText
              ? `*${thinkingText}*\n\n${responseText}`
              : responseText

            // Update UI with accumulated text
            if (fullText) {
              setChatMessages(prev => {
                const messages = [...prev]
                const lastMsg = messages[messages.length - 1]

                if (lastMsg?.message.role === "assistant") {
                  messages[messages.length - 1] = {
                    ...lastMsg,
                    message: {
                      ...lastMsg.message,
                      content: fullText
                    }
                  }
                } else {
                  messages.push({
                    message: {
                      chat_id: selectedChat?.id || "",
                      assistant_id: null,
                      content: fullText,
                      created_at: new Date().toISOString(),
                      id: `msg_${Date.now()}`,
                      image_paths: [],
                      model: chatSettings?.model || "",
                      role: "assistant",
                      sequence_number: messages.length,
                      updated_at: new Date().toISOString(),
                      user_id: ""
                    },
                    fileItems: []
                  })
                }

                return messages
              })
            }
          }
        } finally {
          // Ensure reader is cancelled on every exit path
          reader.cancel().catch(() => {})
        }

        // Exit outer loop if we completed or errored
        if (shouldExitLoop) break
      }

      setIsGenerating(false)
      setFirstTokenReceived(false)
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // User cancelled
      } else {
        console.error("Send message error:", error)
      }
      setIsGenerating(false)
      setFirstTokenReceived(false)
      setUserInput(startingInput)
    }
  }

  const handleSendEdit = async (
    editedContent: string,
    sequenceNumber: number
  ) => {
    const filteredMessages = chatMessages.filter(
      chatMessage => chatMessage.message.sequence_number < sequenceNumber
    )

    setChatMessages(filteredMessages)

    handleSendMessage(editedContent, filteredMessages, false)
  }

  return {
    chatInputRef,
    handleNewChat,
    handleSendMessage,
    handleFocusChatInput,
    handleStopMessage,
    handleSendEdit
  }
}
