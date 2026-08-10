/**
 * Chat Handler — Uses AIPlatformClient for all execution.
 * Replaces the old handler that was coupled to Supabase, DB, and LLM providers.
 * Per ARCHITECTURE.md Phase 2: execute() is the single entry point.
 * Per ARCHITECTURE.md Phase 7: Durable jobs with polling fallback when SSE fails.
 */

import { ChatbotUIContext } from "@/context/context"
import { ChatMessage } from "@/types"
import { useRouter } from "next/navigation"
import { useContext, useEffect, useRef, useCallback } from "react"

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

  /**
   * Render a finished research package as readable markdown.
   *
   * The backend returns a structured research_package (document_title,
   * executive_summary, sections[], source_notes[]) -- dumping that raw JSON into the
   * chat is unreadable, so format it. Falls back to JSON for unknown shapes.
   */
  const renderResearchResult = useCallback((result: unknown): string => {
    if (typeof result === "string") return result
    if (!result || typeof result !== "object") return String(result ?? "")

    const root = result as Record<string, any>
    const pkg = root.research_package ?? root
    if (!pkg || typeof pkg !== "object") return JSON.stringify(result, null, 2)

    const parts: string[] = []

    if (pkg.document_title) parts.push(`# ${pkg.document_title}`)
    if (pkg.executive_summary) {
      parts.push(`## Executive summary\n\n${pkg.executive_summary}`)
    }

    if (Array.isArray(pkg.sections)) {
      for (const section of pkg.sections) {
        if (typeof section === "string") {
          parts.push(section)
        } else if (section && typeof section === "object") {
          const title = section.title ? `## ${section.title}\n\n` : ""
          parts.push(`${title}${section.content ?? ""}`)
        }
      }
    }

    if (Array.isArray(pkg.source_notes) && pkg.source_notes.length > 0) {
      const sources = pkg.source_notes
        .map((note: any, index: number) => {
          const id = note?.citation_id ?? index + 1
          const title = note?.title ?? note?.url ?? "Untitled source"
          const domain = note?.domain ? ` — ${note.domain}` : ""
          return `${id}. ${title}${domain}`
        })
        .join("\n")
      parts.push(`## Sources\n\n${sources}`)
    }

    const metadata = root.metadata ?? pkg.metadata
    if (metadata?.final_quality_score !== undefined) {
      parts.push(`_Quality score: ${metadata.final_quality_score}_`)
    }

    const rendered = parts.filter(Boolean).join("\n\n").trim()
    return rendered || JSON.stringify(result, null, 2)
  }, [])

  /**
   * Helper to commit assistant message to chat
   * Extracted from SSE read loop for reuse with polling fallback
   */
  const commitAssistantMessage = useCallback(
    (
      content: string,
      setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
      selectedChat: { id: string } | null,
      chatSettings: { model?: string } | null | undefined
    ) => {
      setChatMessages(prev => {
        const messages = [...prev]
        const lastMsg = messages[messages.length - 1]

        if (lastMsg?.message.role === "assistant") {
          messages[messages.length - 1] = {
            ...lastMsg,
            message: { ...lastMsg.message, content }
          }
        } else {
          messages.push({
            message: {
              chat_id: selectedChat?.id || "",
              assistant_id: null,
              content,
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
    },
    []
  )

  /**
   * Poll execution status via REST as fallback when SSE doesn't deliver events.
   * Per ARCHITECTURE.md Phase 7: Durable jobs support polling/reconnection.
   */
  const pollExecutionResult = async (
    executionId: string,
    abortSignal: AbortSignal,
    maxAttempts = 60,
    intervalMs = 5000
  ): Promise<string | null> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (abortSignal.aborted) {
        throw new DOMException("Aborted", "AbortError")
      }

      try {
        const response = await fetch(`/api/v1/executions/${executionId}`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.any([abortSignal, AbortSignal.timeout(10000)])
        })

        if (response.ok) {
          const data = await response.json()
          const status = data.status || data.execution?.status

          if (status === "completed" || status === "succeeded") {
            if (data.result) {
              return renderResearchResult(data.result)
            }
            if (data.document?.sections) {
              return data.document.sections.join("\n\n")
            }
            if (data.execution?.result) {
              return renderResearchResult(data.execution.result)
            }
            if (data.execution?.document?.sections) {
              return data.execution.document.sections.join("\n\n")
            }
            return "Research completed but no result content found."
          }

          if (status === "failed" || status === "error") {
            // Throw a sentinel error that preserves the real error message
            const error = new Error(
              data.error || data.message || "Research failed"
            )
            ;(
              error as Error & { __isTerminalError: boolean }
            ).__isTerminalError = true
            throw error
          }

          // Still running - update status
          if (status) {
            setToolInUse(status)
          }
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") throw e
        // Check for our sentinel terminal error
        if ((e as Error & { __isTerminalError?: boolean }).__isTerminalError)
          throw e
        console.warn(`Poll attempt ${attempt + 1} failed:`, e)
      }

      // Wait before next poll - skip delay on final attempt, make cancellable
      if (attempt < maxAttempts - 1) {
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(resolve, intervalMs)
            abortSignal.addEventListener(
              "abort",
              () => {
                clearTimeout(timeout)
                reject(new DOMException("Aborted", "AbortError"))
              },
              { once: true }
            )
          })
        } catch (e) {
          if ((e as Error).name === "AbortError") throw e
          throw e
        }
      }
    }

    throw new Error("Polling timeout: execution did not complete in time")
  }

  const handleSendMessage = async (
    messageContent: string,
    chatMessages: ChatMessage[],
    isRegeneration: boolean
  ) => {
    const startingInput = messageContent

    try {
      setUserInput("")
      setIsGenerating(true)
      setToolInUse("none")
      setIsPromptPickerOpen(false)
      setIsFilePickerOpen(false)
      setNewMessageImages([])

      // Show the user's own message immediately. Research runs for many minutes, and
      // without this the screen stays completely empty the whole time, which is
      // indistinguishable from the app being broken.
      if (!isRegeneration) {
        setChatMessages(prev => [
          ...prev,
          {
            message: {
              chat_id: selectedChat?.id || "",
              assistant_id: null,
              content: messageContent,
              created_at: new Date().toISOString(),
              id: `msg_user_${Date.now()}`,
              image_paths: [],
              model: chatSettings?.model || "",
              role: "user",
              sequence_number: prev.length,
              updated_at: new Date().toISOString(),
              user_id: ""
            },
            fileItems: []
          }
        ])
      }

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
        console.error(
          `[ChatHandler] SSE connection failed (${sseResponse.status}): ${errorText} — falling back to polling`
        )
        // Don't throw — sseCompleted stays false, so Step 4 polling runs
      }

      // Step 3: Read SSE stream with timeout — don't block forever
      let thinkingText = ""
      let responseText = ""
      let progressNotes = ""
      let buffer = ""
      let sseCompleted = false

      if (sseResponse.body) {
        const reader = sseResponse.body.getReader()
        const decoder = new TextDecoder()

        try {
          while (!newAbortController.signal.aborted) {
            const readPromise = reader.read()
            let timeoutId: ReturnType<typeof setTimeout> | undefined
            const timeoutPromise = new Promise<{
              done: boolean
              value: Uint8Array | undefined
            }>((_, reject) => {
              timeoutId = setTimeout(
                () => reject(new DOMException("SSE timeout", "TimeoutError")),
                5000
              )
            })

            let result: { done: boolean; value: Uint8Array | undefined }
            try {
              result = await Promise.race([readPromise, timeoutPromise])
            } catch (e) {
              if ((e as Error).name === "TimeoutError") break // No data for 5s, move to polling
              throw e
            } finally {
              clearTimeout(timeoutId)
            }

            const { done, value } = result
            if (done) {
              sseCompleted = true
              break
            }

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

              if (eventType === "execution_updated") {
                const status = (eventData.status as string) || ""
                if (status) setToolInUse(status)
              } else if (eventType === "workflow_note_added") {
                const note =
                  (eventData.note as string) || (eventData.message as string) || ""
                if (note) {
                  setToolInUse(note)
                  progressNotes += `\n\n${note}`
                  setFirstTokenReceived(true)
                  // Surface progress live. Research takes many minutes, so the notes are
                  // the only feedback the user gets until the document is ready.
                  commitAssistantMessage(
                    `_Researching…_\n${progressNotes}`,
                    setChatMessages,
                    selectedChat,
                    chatSettings
                  )
                }
              } else if (eventType === "execution_completed") {
                // Fetch the actual result
                let fetchedResult = false
                try {
                  const execResponse = await fetch(
                    `/api/v1/executions/${executionId}`,
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
                      responseText = renderResearchResult(execData.result)
                      fetchedResult = true
                    } else if (execData.document?.sections) {
                      responseText = execData.document.sections.join("\n\n")
                      fetchedResult = true
                    } else if (execData.execution?.result) {
                      responseText = renderResearchResult(
                        execData.execution.result
                      )
                      fetchedResult = true
                    }
                  }
                } catch (e) {
                  console.error("Failed to fetch execution result:", e)
                }
                if (fetchedResult) {
                  sseCompleted = true
                  // Commit the result to UI before stopping the loop
                  const fullText = thinkingText
                    ? `*${thinkingText}*\n\n${responseText}`
                    : responseText
                  if (fullText) {
                    commitAssistantMessage(
                      fullText,
                      setChatMessages,
                      selectedChat,
                      chatSettings
                    )
                  }
                  // Stop the outer while loop — result obtained
                  reader.cancel().catch(() => {})
                  // Signal outer loop to stop via a sentinel
                  throw new DOMException("Result obtained", "ResultObtained")
                }
                // fetch failed or no result shape matched — keep sseCompleted false so polling runs
                break
              } else if (
                eventType === "execution.failed" ||
                eventType === "error"
              ) {
                throw new Error(
                  (eventData.message as string) || "Research failed"
                )
              }
            }

            const fullText = thinkingText
              ? `*${thinkingText}*\n\n${responseText}`
              : responseText

            if (fullText) {
              commitAssistantMessage(
                fullText,
                setChatMessages,
                selectedChat,
                chatSettings
              )
            }
          }
        } finally {
          reader.cancel().catch(() => {})
        }
      }

      // Step 4: If SSE didn't deliver completion event, fall back to polling
      let completionReceived = false
      if (!sseCompleted && !newAbortController.signal.aborted) {
        console.log(
          "[ChatHandler] SSE stream ended without completion, falling back to polling..."
        )
        setToolInUse("polling for result...")

        try {
          const polledResult = await pollExecutionResult(
            executionId,
            newAbortController.signal
          )
          if (polledResult) {
            responseText = polledResult
            completionReceived = true
            setFirstTokenReceived(true)
            commitAssistantMessage(
              responseText,
              setChatMessages,
              selectedChat,
              chatSettings
            )
          }
        } catch (pollError) {
          if ((pollError as Error).name === "AbortError") {
            throw pollError
          }
          // Check for our sentinel terminal error
          if (
            (pollError as Error & { __isTerminalError?: boolean })
              .__isTerminalError
          ) {
            const errorMsg = `Research failed: ${(pollError as Error).message}`
            commitAssistantMessage(
              errorMsg,
              setChatMessages,
              selectedChat,
              chatSettings
            )
            throw pollError
          }
          console.error("Polling fallback failed:", pollError)
          // Show user-visible error message — commit once, don't rethrow generic
          const errorMsg = `Research failed: ${(pollError as Error).message}`
          commitAssistantMessage(
            errorMsg,
            setChatMessages,
            selectedChat,
            chatSettings
          )
          // Reset generation state before returning
          setIsGenerating(false)
          setFirstTokenReceived(false)
          setToolInUse("none")
          return
        }
      }

      setIsGenerating(false)
      setFirstTokenReceived(false)
      setToolInUse("none")
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // User cancelled
      } else if ((error as Error).name === "ResultObtained") {
        // Result fetched successfully via execution_completed — normal exit
      } else if (
        (error as Error & { __isTerminalError?: boolean }).__isTerminalError
      ) {
        // Terminal error from polling - show the real error message
        const errorMsg = `Research failed: ${(error as Error).message}`
        commitAssistantMessage(
          errorMsg,
          setChatMessages,
          selectedChat,
          chatSettings
        )
      } else {
        console.error("Send message error:", error)
        const errorMsg = `Error: ${(error as Error).message}`
        commitAssistantMessage(
          errorMsg,
          setChatMessages,
          selectedChat,
          chatSettings
        )
      }
      setIsGenerating(false)
      setFirstTokenReceived(false)
      setToolInUse("none")
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
