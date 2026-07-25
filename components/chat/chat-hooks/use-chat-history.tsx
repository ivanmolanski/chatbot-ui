import { ChatbotUIContext } from "@/context/context"
import { useContext, useState } from "react"

/**
 * Custom hook for handling chat history in the chat component.
 * It provides functions to set the new message content to the previous or next user message in the chat history.
 *
 * @returns An object containing the following functions:
 *   - setNewMessageContentToPreviousUserMessage: Sets the new message content to the previous user message.
 *   - setNewMessageContentToNextUserMessage: Sets the new message content to the next user message in the chat history.
 */
export const useChatHistoryHandler = () => {
  const { setUserInput, chatMessages, isGenerating } =
    useContext(ChatbotUIContext)
  const userRoleString = "user"

  // Clamp index in render body — no effect needed
  const [messageHistoryIndex, setMessageHistoryIndex] = useState<number>(
    chatMessages.length
  )
  // Always cap at the current list length, even while generating,
  // so navigation never indexes beyond the live message list.
  const clampedIndex = Math.min(messageHistoryIndex, chatMessages.length)

  /**
   * Sets the new message content to the previous user message.
   */
  const setNewMessageContentToPreviousUserMessage = () => {
    let tempIndex = clampedIndex
    while (
      tempIndex > 0 &&
      chatMessages[tempIndex - 1].message.role !== userRoleString
    ) {
      tempIndex--
    }

    const previousUserMessage =
      chatMessages.length > 0 && tempIndex > 0
        ? chatMessages[tempIndex - 1]
        : null
    if (previousUserMessage) {
      setUserInput(previousUserMessage.message.content)
      setMessageHistoryIndex(tempIndex - 1)
    }
  }

  /**
   * Sets the new message content to the next user message in the chat history.
   * If there is a next user message, it updates the user input and message history index accordingly.
   * If there is no next user message, it resets the user input and sets the message history index to the end of the chat history.
   */
  const setNewMessageContentToNextUserMessage = () => {
    let tempIndex = clampedIndex
    while (
      tempIndex < chatMessages.length - 1 &&
      chatMessages[tempIndex + 1].message.role !== userRoleString
    ) {
      tempIndex++
    }

    const nextUserMessage =
      chatMessages.length > 0 && tempIndex < chatMessages.length - 1
        ? chatMessages[tempIndex + 1]
        : null
    setUserInput(nextUserMessage?.message.content || "")
    setMessageHistoryIndex(
      nextUserMessage ? tempIndex + 1 : chatMessages.length
    )
  }

  return {
    setNewMessageContentToPreviousUserMessage,
    setNewMessageContentToNextUserMessage
  }
}
