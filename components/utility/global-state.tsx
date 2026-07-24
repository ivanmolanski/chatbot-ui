/**
 * GlobalState — Application state provider.
 * Uses AIPlatformClient for all data. Zero Supabase. Zero DB.
 * Per ARCHITECTURE.md Phase 1: Execution is primary.
 * Per ARCHITECTURE.md Phase 8: Capabilities are negotiated at startup.
 */

"use client"

import { ChatbotUIContext } from "@/context/context"
import { HTTPTransport } from "@/lib/ai-platform/transport/http"
import { AFDeepResearchAdapter } from "@/lib/ai-platform/adapters/af-deep-research"
import { AIPlatformClientImpl } from "@/lib/ai-platform/client-impl"
import type { AIPlatformClient } from "@/lib/ai-platform/client"
import type { PlatformCapabilities } from "@/lib/ai-platform/domain/types"
import { ChatMessage, ChatSettings, ChatFile, MessageImage } from "@/types"
import { FC, useEffect, useState, useRef } from "react"

interface GlobalStateProps {
  children: React.ReactNode
}

export const GlobalState: FC<GlobalStateProps> = ({ children }) => {
  const clientRef = useRef<AIPlatformClient | null>(null)

  // PLATFORM CLIENT
  const [client, setClient] = useState<AIPlatformClient | null>(null)
  const [capabilities, setCapabilities] = useState<PlatformCapabilities | null>(
    null
  )

  // PROFILE STORE
  const [profile, setProfile] = useState<any>(null)

  // ITEMS STORE
  const [assistants, setAssistants] = useState<any[]>([])
  const [collections, setCollections] = useState<any[]>([])
  const [chats, setChats] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [folders, setFolders] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [presets, setPresets] = useState<any[]>([])
  const [prompts, setPrompts] = useState<any[]>([])
  const [tools, setTools] = useState<any[]>([])
  const [workspaces, setWorkspaces] = useState<any[]>([])

  // MODELS STORE
  const [envKeyMap, setEnvKeyMap] = useState<Record<string, string>>({})
  const [availableHostedModels, setAvailableHostedModels] = useState<any[]>([])
  const [availableLocalModels, setAvailableLocalModels] = useState<any[]>([])
  const [availableOpenRouterModels, setAvailableOpenRouterModels] = useState<
    any[]
  >([])

  // WORKSPACE STORE
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null)
  const [workspaceImages, setWorkspaceImages] = useState<any[]>([])

  // PRESET STORE
  const [selectedPreset, setSelectedPreset] = useState<any>(null)

  // ASSISTANT STORE
  const [selectedAssistant, setSelectedAssistant] = useState<any>(null)
  const [assistantImages, setAssistantImages] = useState<any[]>([])
  const [openaiAssistants, setOpenaiAssistants] = useState<any[]>([])

  // PASSIVE CHAT STORE
  const [userInput, setUserInput] = useState<string>("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    model: "gpt-4-turbo-preview",
    prompt: "You are a helpful AI assistant.",
    temperature: 0.5,
    contextLength: 4000,
    includeProfileContext: true,
    includeWorkspaceInstructions: true,
    embeddingsProvider: "openai"
  })
  const [selectedChat, setSelectedChat] = useState<any>(null)
  const [chatFileItems, setChatFileItems] = useState<any[]>([])

  // ACTIVE CHAT STORE
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [firstTokenReceived, setFirstTokenReceived] = useState<boolean>(false)
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)

  // CHAT INPUT COMMAND STORE
  const [isPromptPickerOpen, setIsPromptPickerOpen] = useState(false)
  const [slashCommand, setSlashCommand] = useState("")
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false)
  const [hashtagCommand, setHashtagCommand] = useState("")
  const [isToolPickerOpen, setIsToolPickerOpen] = useState(false)
  const [toolCommand, setToolCommand] = useState("")
  const [focusPrompt, setFocusPrompt] = useState(false)
  const [focusFile, setFocusFile] = useState(false)
  const [focusTool, setFocusTool] = useState(false)
  const [focusAssistant, setFocusAssistant] = useState(false)
  const [atCommand, setAtCommand] = useState("")
  const [isAssistantPickerOpen, setIsAssistantPickerOpen] = useState(false)

  // ATTACHMENTS STORE
  const [chatFiles, setChatFiles] = useState<ChatFile[]>([])
  const [chatImages, setChatImages] = useState<MessageImage[]>([])
  const [newMessageFiles, setNewMessageFiles] = useState<ChatFile[]>([])
  const [newMessageImages, setNewMessageImages] = useState<MessageImage[]>([])
  const [showFilesDisplay, setShowFilesDisplay] = useState<boolean>(false)

  // RETRIEVAL STORE
  const [useRetrieval, setUseRetrieval] = useState<boolean>(true)
  const [sourceCount, setSourceCount] = useState<number>(4)

  // TOOL STORE
  const [selectedTools, setSelectedTools] = useState<any[]>([])
  const [toolInUse, setToolInUse] = useState<string>("none")

  useEffect(() => {
    // Initialize the platform client per ARCHITECTURE.md Phase 2
    // Transport + Adapter pattern — UI never knows the backend
    const transport = new HTTPTransport("/api/v1")
    const adapter = new AFDeepResearchAdapter()
    const platformClient = new AIPlatformClientImpl(transport, adapter)
    clientRef.current = platformClient
    setClient(platformClient)

    // Phase 8: Capability negotiation at startup
    platformClient
      .getCapabilities()
      .then(caps => {
        setCapabilities(caps)
      })
      .catch(() => {
        // Backend not available yet — UI works offline
      })
  }, [])

  return (
    <ChatbotUIContext.Provider
      value={{
        // PLATFORM
        capabilities,
        setCapabilities,

        // PROFILE STORE
        profile,
        setProfile,

        // ITEMS STORE
        assistants,
        setAssistants,
        collections,
        setCollections,
        chats,
        setChats,
        files,
        setFiles,
        folders,
        setFolders,
        models,
        setModels,
        presets,
        setPresets,
        prompts,
        setPrompts,
        tools,
        setTools,
        workspaces,
        setWorkspaces,

        // MODELS STORE
        envKeyMap,
        setEnvKeyMap,
        availableHostedModels,
        setAvailableHostedModels,
        availableLocalModels,
        setAvailableLocalModels,
        availableOpenRouterModels,
        setAvailableOpenRouterModels,

        // WORKSPACE STORE
        selectedWorkspace,
        setSelectedWorkspace,
        workspaceImages,
        setWorkspaceImages,

        // PRESET STORE
        selectedPreset,
        setSelectedPreset,

        // ASSISTANT STORE
        selectedAssistant,
        setSelectedAssistant,
        assistantImages,
        setAssistantImages,
        openaiAssistants,
        setOpenaiAssistants,

        // PASSIVE CHAT STORE
        userInput,
        setUserInput,
        chatMessages,
        setChatMessages,
        chatSettings,
        setChatSettings,
        selectedChat,
        setSelectedChat,
        chatFileItems,
        setChatFileItems,

        // ACTIVE CHAT STORE
        isGenerating,
        setIsGenerating,
        firstTokenReceived,
        setFirstTokenReceived,
        abortController,
        setAbortController,

        // CHAT INPUT COMMAND STORE
        isPromptPickerOpen,
        setIsPromptPickerOpen,
        slashCommand,
        setSlashCommand,
        isFilePickerOpen,
        setIsFilePickerOpen,
        hashtagCommand,
        setHashtagCommand,
        isToolPickerOpen,
        setIsToolPickerOpen,
        toolCommand,
        setToolCommand,
        focusPrompt,
        setFocusPrompt,
        focusFile,
        setFocusFile,
        focusTool,
        setFocusTool,
        focusAssistant,
        setFocusAssistant,
        atCommand,
        setAtCommand,
        isAssistantPickerOpen,
        setIsAssistantPickerOpen,

        // ATTACHMENT STORE
        chatFiles,
        setChatFiles,
        chatImages,
        setChatImages,
        newMessageFiles,
        setNewMessageFiles,
        newMessageImages,
        setNewMessageImages,
        showFilesDisplay,
        setShowFilesDisplay,

        // RETRIEVAL STORE
        useRetrieval,
        setUseRetrieval,
        sourceCount,
        setSourceCount,

        // TOOL STORE
        selectedTools,
        setSelectedTools,
        toolInUse,
        setToolInUse
      }}
    >
      {children}
    </ChatbotUIContext.Provider>
  )
}
