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

      // Step 1: Start execution
      const executeResponse = await fetch(
        "/api/v1/execute/async/meta_deep_research.execute_deep_research",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({ input: { query: messageContent } }),
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

      // Step 2: Connect to SSE stream
      const sseUrl = `/api/executions/events?execution_id=${encodeURIComponent(executionId)}`
      const sseResponse = await fetch(sseUrl, {
        headers: { Accept: "text/event-stream" },
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

      // Step 3: Read SSE stream
      if (sseResponse.body) {
        const reader = sseResponse.body.getReader()
        const decoder = new TextDecoder()
        let thinkingText = ""
        let responseText = ""
        let progressNotes = ""
        let buffer = ""

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })

            const lines = buffer.split(/\r?\n/)
            buffer = lines.pop() || ""

            for (const line of lines) {
              const trimmed = line.replace(/\r$/, "")
              if (!trimmed.startsWith("data:")) continue
              const jsonStr = trimmed.slice(5).trimStart()
              if (!jsonStr || jsonStr === "[DONE]") continue

              let event: Record<string, unknown>
              try {
                event = JSON.parse(jsonStr) as Record<string, unknown>
              } catch {
                if (jsonStr) {
                  responseText += jsonStr
                  setFirstTokenReceived(true)
                }
                continue
              }

              const eventType = (event.type as string) || ""
              const eventData = (event.data as Record<string, unknown>) || event

              const eventExecutionId =
                (eventData.execution_id as string) ||
                (event.executionId as string) ||
                (event.execution_id as string)
              if (eventExecutionId && eventExecutionId !== executionId) {
                continue
              }

              if (eventType === "execution_updated") {
                const status = (eventData.status as string) || ""
                if (status) setToolInUse(status)
              } else if (eventType === "workflow_note_added") {
                const noteData = eventData.note as
                  Record<string, unknown> | undefined
                const note =
                  (noteData?.message as string) ||
                  (eventData.message as string) ||
                  ""
                if (note) {
                  setToolInUse(note)
                  if (!progressNotes) progressNotes = ""
                  progressNotes += `\n\n${note}`
                  setFirstTokenReceived(true)
                }
              } else if (
                eventType === "execution_completed" ||
                eventType === "execution.failed"
              ) {
                if (eventType === "execution.failed") {
                  throw new Error(
                    (eventData.message as string) || "Research failed"
                  )
                }

                const resultExecutionId =
                  eventExecutionId || (eventData.execution_id as string)
                if (resultExecutionId) {
                  try {
                    const execResponse = await fetch(
                      `/api/v1/executions/${resultExecutionId}`,
                      {
                        headers: { Accept: "application/json" },
                        signal: AbortSignal.any([
                          newAbortController.signal,
                          AbortSignal.timeout(10000)
                        ])
                      }
                    )

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
                    const errName = (e as Error).name
                    if (errName === "TimeoutError") {
                      throw new Error("Execution result fetch timed out")
                    }
                    if (errName === "AbortError") {
                      throw e
                    }
                    console.error("Failed to fetch execution result:", e)
                    throw new Error("Failed to fetch execution result")
                  }
                } else if (eventData.result) {
                  responseText = stringifyResult(eventData.result)
                } else if (
                  eventData.document &&
                  (eventData.document as Record<string, unknown>).sections
                ) {
                  responseText = (
                    (eventData.document as Record<string, unknown>)
                      .sections as string[]
                  ).join("\n\n")
                }

                if (responseText) {
                  setFirstTokenReceived(true)
                }
                break
              } else if (eventType === "error") {
                throw new Error(
                  (eventData.message as string) || "Research failed"
                )
              } else if (
                eventType === "token" ||
                eventType === "content.delta"
              ) {
                const text =
                  (eventData.text as string) ||
                  (eventData.content as string) ||
                  ""
                if (text) {
                  responseText += text
                  setFirstTokenReceived(true)
                }
              } else if (
                eventType === "thinking" ||
                eventType === "thinking.delta"
              ) {
                const thinkText =
                  (eventData.text as string) ||
                  (eventData.content as string) ||
                  ""
                if (thinkText) {
                  thinkingText += thinkText
                }
              } else if (
                eventType === "status" ||
                eventType === "status.changed"
              ) {
                const msg =
                  (eventData.message as string) ||
                  (eventData.status as string) ||
                  ""
                if (msg) setToolInUse(msg)
              } else if (
                eventType === "progress" ||
                eventType === "progress.updated"
              ) {
                const step =
                  (eventData.currentStep as string) ||
                  (eventData.step as string) ||
                  ""
                if (step) setToolInUse(step)
              }
            }

            const fullText = thinkingText
              ? `*${thinkingText}*\n\n${responseText}${progressNotes || ""}`
              : `${responseText}${progressNotes || ""}`

            if (fullText) {
              setChatMessages(prev => {
                const messages = [...prev]
                const lastMsg = messages[messages.length - 1]

                if (lastMsg?.message.role === "assistant") {
                  messages[messages.length - 1] = {
                    ...lastMsg,
                    message: { ...lastMsg.message, content: fullText }
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
          reader.cancel().catch(() => {})
        }
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
      (chatMessage: ChatMessage) =>
        chatMessage.message.sequence_number < sequenceNumber
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
