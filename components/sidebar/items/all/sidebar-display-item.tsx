import { ChatbotUIContext } from "@/context/context"
import { cn } from "@/lib/utils"
import { ContentType, DataItemType } from "@/types"
import { useRouter } from "next/navigation"
import { FC, useContext, useRef, useState } from "react"
import { SidebarUpdateItem } from "./sidebar-update-item"

interface SidebarItemProps {
  item: DataItemType
  isTyping: boolean
  contentType: ContentType
  icon: React.ReactNode
  updateState: any
  renderInputs: (renderState: any) => JSX.Element
}

export const SidebarItem: FC<SidebarItemProps> = ({
  item,
  contentType,
  updateState,
  renderInputs,
  icon,
  isTyping
}) => {
  const { selectedWorkspace, setChats, setSelectedAssistant } =
    useContext(ChatbotUIContext)

  const router = useRouter()

  const itemRef = useRef<HTMLDivElement>(null)

  const [isHovering, setIsHovering] = useState(false)

  const actionMap = {
    chats: async (item: any) => {},
    presets: async (item: any) => {},
    prompts: async (item: any) => {},
    files: async (item: any) => {},
    collections: async (item: any) => {},
    assistants: async (assistant: any) => {
      if (!selectedWorkspace) return

      // Per ARCHITECTURE.md: chat creation delegated to control plane
      try {
        const response = await fetch("/api/v1/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: selectedWorkspace.id,
            assistant_id: assistant.id,
            name: `Chat with ${assistant.name}`,
            model: assistant.model,
            prompt: assistant.prompt,
            temperature: assistant.temperature,
            context_length: assistant.context_length,
            embeddings_provider: assistant.embeddings_provider
          })
        })

        if (response.ok) {
          const createdChat = await response.json()
          setChats((prevState: any) => [createdChat, ...prevState])
          setSelectedAssistant(assistant)
          return router.push(`/${selectedWorkspace.id}/chat/${createdChat.id}`)
        }
      } catch (error) {
        console.error("Failed to create chat:", error)
      }
    },
    tools: async (item: any) => {},
    models: async (item: any) => {}
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.stopPropagation()
      itemRef.current?.click()
    }
  }

  return (
    <SidebarUpdateItem
      item={item}
      isTyping={isTyping}
      contentType={contentType}
      updateState={updateState}
      renderInputs={renderInputs}
    >
      <div
        ref={itemRef}
        className={cn(
          "hover:bg-accent flex w-full cursor-pointer items-center rounded p-2 hover:opacity-50 focus:outline-none"
        )}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {icon}

        <div className="ml-3 flex-1 truncate text-sm font-semibold">
          {item.name}
        </div>
      </div>
    </SidebarUpdateItem>
  )
}
