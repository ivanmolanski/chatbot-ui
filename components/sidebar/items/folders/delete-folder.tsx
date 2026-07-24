import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { ChatbotUIContext } from "@/context/context"
import { ContentType } from "@/types"
import { IconTrash } from "@tabler/icons-react"
import { FC, useContext, useRef, useState } from "react"
import { toast } from "sonner"

interface DeleteFolderProps {
  folder: any
  contentType: ContentType
}

export const DeleteFolder: FC<DeleteFolderProps> = ({
  folder,
  contentType
}) => {
  const {
    setChats,
    setFolders,
    setPresets,
    setPrompts,
    setFiles,
    setCollections,
    setAssistants,
    setTools,
    setModels
  } = useContext(ChatbotUIContext)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showFolderDialog, setShowFolderDialog] = useState(false)

  const stateUpdateFunctions = {
    chats: setChats,
    presets: setPresets,
    prompts: setPrompts,
    files: setFiles,
    collections: setCollections,
    assistants: setAssistants,
    tools: setTools,
    models: setModels
  }

  const handleDeleteFolderOnly = async () => {
    try {
      await fetch(`/api/v1/folders/${folder.id}`, { method: "DELETE" })
    } catch (e) {
      console.error("Failed to delete folder:", e)
    }

    setFolders((prevState: any) =>
      prevState.filter((c: any) => c.id !== folder.id)
    )
    setShowFolderDialog(false)

    const setStateFunction = stateUpdateFunctions[contentType]
    if (!setStateFunction) return

    setStateFunction((prevItems: any) =>
      prevItems.map((item: any) => {
        if (item.folder_id === folder.id) {
          return { ...item, folder_id: null }
        }
        return item
      })
    )
  }

  const handleDeleteFolderAndItems = async () => {
    const setStateFunction = stateUpdateFunctions[contentType]
    if (!setStateFunction) return

    try {
      await fetch(`/api/v1/folders/${folder.id}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType })
      })
    } catch (e) {
      toast.error("Failed to delete folder items")
    }

    setStateFunction((prevItems: any) =>
      prevItems.filter((item: any) => item.folder_id !== folder.id)
    )

    handleDeleteFolderOnly()
  }

  return (
    <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
      <DialogTrigger asChild>
        <IconTrash className="hover:opacity-50" size={18} />
      </DialogTrigger>

      <DialogContent className="min-w-[550px]">
        <DialogHeader>
          <DialogTitle>Delete {folder.name}</DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this folder?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowFolderDialog(false)}>
            Cancel
          </Button>

          <Button
            ref={buttonRef}
            variant="destructive"
            onClick={handleDeleteFolderAndItems}
          >
            Delete Folder & Included Items
          </Button>

          <Button variant="destructive" onClick={handleDeleteFolderOnly}>
            Delete Folder Only
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
