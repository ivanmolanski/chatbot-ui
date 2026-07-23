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

      // Per ARCHITECTURE.md Phase 2: execute() is the single entry point
      // The AIPlatformClient handles all execution types
      // For now, use the proxy route which forwards to the control plane
      const response = await fetch("/api/v1/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream"
        },
        body: JSON.stringify({
          type: "chat",
          input: { content: messageContent },
          config: chatSettings || {}
        }),
        signal: newAbortController.signal
      })

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`)
      }

      // Stream the response
      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullText = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          fullText += chunk

          setFirstTokenReceived(true)

          // Update the assistant message in real-time
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