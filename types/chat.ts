import { ChatMessage, LLMID } from "."

export interface ChatSettings {
  model: LLMID
  prompt: string
  temperature: number
  contextLength: number
  includeProfileContext: boolean
  includeWorkspaceInstructions: boolean
  embeddingsProvider: "openai" | "local"
}

export interface ChatPayload {
  chatSettings: ChatSettings
  workspaceInstructions: string
  chatMessages: ChatMessage[]
  assistant: any | null
  messageFileItems: any[]
  chatFileItems: any[]
}

export interface ChatAPIPayload {
  chatSettings: ChatSettings
  messages: any[]
}
