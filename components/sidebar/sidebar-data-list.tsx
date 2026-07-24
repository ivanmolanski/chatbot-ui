/**
 * Sidebar Data List — Per ARCHITECTURE.md Phase 12.
 * Zero DB, zero Supabase types. Uses context state only.
 * CRUD operations delegated to control plane via proxy API.
 */

import { ChatbotUIContext } from "@/context/context"
import { cn } from "@/lib/utils"
import { ContentType, DataItemType, DataListType } from "@/types"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { Separator } from "../ui/separator"
import { AssistantItem } from "./items/assistants/assistant-item"
import { ChatItem } from "./items/chat/chat-item"
import { CollectionItem } from "./items/collections/collection-item"
import { FileItem } from "./items/files/file-item"
import { Folder } from "./items/folders/folder-item"
import { ModelItem } from "./items/models/model-item"
import { PresetItem } from "./items/presets/preset-item"
import { PromptItem } from "./items/prompts/prompt-item"
import { ToolItem } from "./items/tools/tool-item"

interface SidebarDataListProps {
  contentType: ContentType
  data: DataListType
  folders: any[]
}

export const SidebarDataList: FC<SidebarDataListProps> = ({
  contentType,
  data,
  folders
}) => {
  const {
    setChats,
    setPresets,
    setPrompts,
    setFiles,
    setCollections,
    setAssistants,
    setTools,
    setModels
  } = useContext(ChatbotUIContext)

  const divRef = useRef<HTMLDivElement>(null)

  const [isOverflowing, setIsOverflowing] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const getDataListComponent = (
    contentType: ContentType,
    item: DataItemType
  ) => {
    switch (contentType) {
      case "chats":
        return <ChatItem key={item.id} chat={item as any} />

      case "presets":
        return <PresetItem key={item.id} preset={item as any} />

      case "prompts":
        return <PromptItem key={item.id} prompt={item as any} />

      case "files":
        return <FileItem key={item.id} file={item as any} />

      case "collections":
        return <CollectionItem key={item.id} collection={item as any} />

      case "assistants":
        return <AssistantItem key={item.id} assistant={item as any} />

      case "tools":
        return <ToolItem key={item.id} tool={item as any} />

      case "models":
        return <ModelItem key={item.id} model={item as any} />

      default:
        return null
    }
  }

  const getSortedData = (
    data: any,
    dateCategory: "Today" | "Yesterday" | "Previous Week" | "Older"
  ) => {
    const now = new Date()
    const todayStart = new Date(now.setHours(0, 0, 0, 0))
    const yesterdayStart = new Date(
      new Date().setDate(todayStart.getDate() - 1)
    )
    const oneWeekAgoStart = new Date(
      new Date().setDate(todayStart.getDate() - 7)
    )

    return data
      .filter((item: any) => {
        const itemDate = new Date(item.updated_at || item.created_at)
        switch (dateCategory) {
          case "Today":
            return itemDate >= todayStart
          case "Yesterday":
            return itemDate >= yesterdayStart && itemDate < todayStart
          case "Previous Week":
            return itemDate >= oneWeekAgoStart && itemDate < yesterdayStart
          case "Older":
            return itemDate < oneWeekAgoStart
          default:
            return true
        }
      })
      .sort(
        (
          a: { updated_at: string; created_at: string },
          b: { updated_at: string; created_at: string }
        ) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      )
  }

  // Per ARCHITECTURE.md: CRUD operations delegated to control plane via proxy API
  const updateFolder = async (itemId: string, folderId: string | null) => {
    try {
      const response = await fetch(`/api/v1/${contentType}/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folderId })
      })
      if (response.ok) {
        const updatedItem = await response.json()
        const setStateFunction = {
          chats: setChats,
          presets: setPresets,
          prompts: setPrompts,
          files: setFiles,
          collections: setCollections,
          assistants: setAssistants,
          tools: setTools,
          models: setModels
        }[contentType]

        if (setStateFunction) {
          setStateFunction((items: any) =>
            items.map((item: any) =>
              item.id === updatedItem.id ? updatedItem : item
            )
          )
        }
      }
    } catch (error) {
      console.error(`Failed to update ${contentType}:`, error)
    }
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData("text/plain", id)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()

    const target = e.target as Element

    if (!target.closest("#folder")) {
      const itemId = e.dataTransfer.getData("text/plain")
      updateFolder(itemId, null)
    }

    setIsDragOver(false)
  }

  useEffect(() => {
    if (divRef.current) {
      setIsOverflowing(
        divRef.current.scrollHeight > divRef.current.clientHeight
      )
    }
  }, [data])

  const dataWithFolders = data.filter((item: any) => item.folder_id)
  const dataWithoutFolders = data.filter((item: any) => item.folder_id === null)

  return (
    <>
      <div
        ref={divRef}
        className="mt-2 flex flex-col overflow-auto"
        onDrop={handleDrop}
      >
        {data.length === 0 && (
          <div className="flex grow flex-col items-center justify-center">
            <div className=" text-centertext-muted-foreground p-8 text-lg italic">
              No {contentType}.
            </div>
          </div>
        )}

        {(dataWithFolders.length > 0 || dataWithoutFolders.length > 0) && (
          <div
            className={`h-full ${
              isOverflowing ? "w-[calc(100%-8px)]" : "w-full"
            } space-y-2 pt-2 ${isOverflowing ? "mr-2" : ""}`}
          >
            {folders.map((folder: any) => (
              <Folder
                key={folder.id}
                folder={folder}
                onUpdateFolder={updateFolder}
                contentType={contentType}
              >
                {dataWithFolders
                  .filter((item: any) => item.folder_id === folder.id)
                  .map((item: any) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, item.id)}
                    >
                      {getDataListComponent(contentType, item)}
                    </div>
                  ))}
              </Folder>
            ))}

            {folders.length > 0 && <Separator />}

            {contentType === "chats" ? (
              <>
                {["Today", "Yesterday", "Previous Week", "Older"].map(
                  dateCategory => {
                    const sortedData = getSortedData(
                      dataWithoutFolders,
                      dateCategory as
                        | "Today"
                        | "Yesterday"
                        | "Previous Week"
                        | "Older"
                    )

                    return (
                      sortedData.length > 0 && (
                        <div key={dateCategory} className="pb-2">
                          <div className="text-muted-foreground mb-1 text-sm font-bold">
                            {dateCategory}
                          </div>

                          <div
                            className={cn(
                              "flex grow flex-col",
                              isDragOver && "bg-accent"
                            )}
                            onDrop={handleDrop}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                          >
                            {sortedData.map((item: any) => (
                              <div
                                key={item.id}
                                draggable
                                onDragStart={e => handleDragStart(e, item.id)}
                              >
                                {getDataListComponent(contentType, item)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )
                  }
                )}
              </>
            ) : (
              <div
                className={cn("flex grow flex-col", isDragOver && "bg-accent")}
                onDrop={handleDrop}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
              >
                {dataWithoutFolders.map((item: any) => {
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, item.id)}
                    >
                      {getDataListComponent(contentType, item)}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className={cn("flex grow", isDragOver && "bg-accent")}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
      />
    </>
  )
}
