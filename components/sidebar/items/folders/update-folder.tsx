import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChatbotUIContext } from "@/context/context"
import { IconEdit } from "@tabler/icons-react"
import { FC, useContext, useRef, useState } from "react"
import { toast } from "sonner"

interface UpdateFolderProps {
  folder: any
}

export const UpdateFolder: FC<UpdateFolderProps> = ({ folder }) => {
  const { setFolders } = useContext(ChatbotUIContext)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [name, setName] = useState(folder.name)

  const handleUpdateFolder = async (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      const response = await fetch(`/api/v1/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      })
      if (response.ok) {
        const updatedFolder = await response.json()
        setFolders((prevState: any) =>
          prevState.map((c: any) => (c.id === folder.id ? updatedFolder : c))
        )
        setShowFolderDialog(false)
      } else {
        const errText = await response.text().catch(() => response.statusText)
        console.error("Failed to update folder:", errText)
        toast.error("Failed to update folder")
      }
    } catch (error) {
      console.error("Failed to update folder:", error)
      toast.error("Failed to update folder")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      buttonRef.current?.click()
    }
  }

  return (
    <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
      <DialogTrigger asChild>
        <IconEdit className="hover:opacity-50" size={18} />
      </DialogTrigger>

      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Edit Folder</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <Label>Name</Label>

          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowFolderDialog(false)}>
            Cancel
          </Button>

          <Button ref={buttonRef} onClick={handleUpdateFolder}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
