/**
 * File Selection Handler — Per ARCHITECTURE.md Phase 12.
 * Zero DB, zero Supabase. Manages UI state only; file persistence delegated to control plane.
 */

import { ChatbotUIContext } from "@/context/context"
import { useContext, useEffect, useState } from "react"
import { toast } from "sonner"

export const ACCEPTED_FILE_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/json",
  "text/markdown",
  "application/pdf",
  "text/plain"
].join(",")

export const useSelectFileHandler = () => {
  const {
    selectedWorkspace,
    chatSettings,
    setNewMessageImages,
    setNewMessageFiles,
    setShowFilesDisplay,
    setUseRetrieval
  } = useContext(ChatbotUIContext)

  const [filesToAccept, setFilesToAccept] = useState(ACCEPTED_FILE_TYPES)

  useEffect(() => {
    const model = chatSettings?.model
    if (!model) return

    // Per ARCHITECTURE.md: model capabilities served by control plane
    // Allow images when model supports vision (determined by control plane)
    setFilesToAccept(
      model.includes("vision") || model.includes("gpt-4o")
        ? `${ACCEPTED_FILE_TYPES},image/*`
        : ACCEPTED_FILE_TYPES
    )
  }, [chatSettings?.model])

  const handleSelectDeviceFile = async (file: File) => {
    if (!selectedWorkspace || !chatSettings) return

    setShowFilesDisplay(true)
    setUseRetrieval(true)

    if (file) {
      let simplifiedFileType = file.type.split("/")[1]

      if (file.type.includes("image")) {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onloadend = function () {
          const imageUrl = URL.createObjectURL(file)
          setNewMessageImages(prev => [
            ...prev,
            {
              messageId: "temp",
              path: "",
              base64: reader.result as string,
              url: imageUrl,
              file
            }
          ])
        }
      } else if (ACCEPTED_FILE_TYPES.split(",").includes(file.type)) {
        if (simplifiedFileType.includes("vnd.adobe.pdf")) {
          simplifiedFileType = "pdf"
        } else if (
          simplifiedFileType.includes(
            "vnd.openxmlformats-officedocument.wordprocessingml.document"
          )
        ) {
          simplifiedFileType = "docx"
        }

        // Per ARCHITECTURE.md: file upload delegated to control plane
        // For now, track file locally for upload with the message
        setNewMessageFiles(prev => [
          ...prev,
          {
            id: `local_${Date.now()}`,
            name: file.name,
            type: simplifiedFileType,
            file: file
          }
        ])
      } else {
        toast.error("Unsupported file type. Supported: CSV, DOCX, JSON, MD, PDF, TXT")
      }
    }
  }

  return {
    handleSelectDeviceFile,
    filesToAccept
  }
}