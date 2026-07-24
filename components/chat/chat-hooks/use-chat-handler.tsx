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

    try {
      setUserInput("")
      setIsGenerating(true)
      setIsPromptPickerOpen(false)
      setIsFilePickerOpen(false)
      setNewMessageImages([])

      const newAbortController = new AbortController()
      setAbortController(newAbortController)

      // AF Deep Research: POST /api/v1/execute/async/{agent}.{reasoner}
      // Backend expects: {"input": {"query": "..."}}
      // Returns SSE stream with research events
      const response = await fetch(
        "/api/v1/execute/async/meta_deep_research.execute_deep_research",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream"
          },
          body: JSON.stringify({
            input: { query: messageContent }
          }),
          signal: newAbortController.signal
        }
      )

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(`Execution failed (${response.status}): ${errorText}`)
      }

      // Stream SSE response from AF backend
      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullText = ""
        let buffer = ""

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

            try {
              const event = JSON.parse(jsonStr)

              // AF events have a "type" field and "data" payload
              const eventType = event.type || ""
              const eventData = event.data || event

              if (eventType === "token" || eventType === "content.delta") {
                const text = eventData.text || eventData.content || ""
                if (text) {
                  fullText += text
                  setFirstTokenReceived(true)
                }
              } else if (
                eventType === "thinking" ||
                eventType === "thinking.delta"
              ) {
                const thinkText = eventData.text || eventData.content || ""
                if (thinkText && !fullText.includes("🔍")) {
                  fullText = `*${thinkText}*\n\n`
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
              } else if (
                eventType === "done" ||
                eventType === "execution.completed"
              ) {
                if (eventData.document?.sections) {
                  fullText = eventData.document.sections.join("\n\n")
                } else if (eventData.result) {
                  fullText =
                    typeof eventData.result === "string"
                      ? eventData.result
                      : JSON.stringify(eventData.result, null, 2)
                }
              } else if (eventType === "error") {
                throw new Error(eventData.message || "Research failed")
              }
            } catch (parseErr) {
              if (jsonStr && !jsonStr.startsWith("{")) {
                fullText += jsonStr
                setFirstTokenReceived(true)
              }
            }
          }

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
