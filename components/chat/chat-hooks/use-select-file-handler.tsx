/**
 * File Selection Handler — Per ARCHITECTURE.md Phase 12.
 * Zero DB, zero Supabase. Manages UI state only; file persistence delegated to control plane.
 */

import { ChatbotUIContext } from "@/context/context"
import { useContext, useMemo, useState } from "react"
import { toast } from "sonner"
import { LLM } from "@/types"

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
    models,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels,
    setNewMessageImages,
    setNewMessageFiles,
    setShowFilesDisplay,
    setUseRetrieval
  } = useContext(ChatbotUIContext)

  const filesToAccept = useMemo(() => {
    const modelId = chatSettings?.model
    if (!modelId) return ACCEPTED_FILE_TYPES

    // Per ARCHITECTURE.md: model capabilities served by control plane.
    // Look up the canonical imageInput flag from model metadata instead
    // of relying on substring heuristics on the model ID.
    const allModels: LLM[] = [
      ...models.map(m => ({
        modelId: m.model_id,
        modelName: m.name,
        provider: "custom" as const,
        hostedId: m.id,
        platformLink: "",
        imageInput: false
      })),
      ...availableHostedModels,
      ...availableLocalModels,
      ...availableOpenRouterModels
    ]
    const matched = allModels.find(m => m.modelId === modelId)
    return matched?.imageInput
      ? `${ACCEPTED_FILE_TYPES},image/*`
      : ACCEPTED_FILE_TYPES
  }, [
    chatSettings?.model,
    models,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels
  ])

  // Check whether the current model supports image uploads
  const supportsImageInput = useMemo(() => {
    const modelId = chatSettings?.model
    if (!modelId) return false
    const allModels: LLM[] = [
      ...models.map(m => ({
        modelId: m.model_id,
        modelName: m.name,
        provider: "custom" as const,
        hostedId: m.id,
        platformLink: "",
        imageInput: false
      })),
      ...availableHostedModels,
      ...availableLocalModels,
      ...availableOpenRouterModels
    ]
    return allModels.find(m => m.modelId === modelId)?.imageInput ?? false
  }, [
    chatSettings?.model,
    models,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels
  ])

  const handleSelectDeviceFile = async (file: File) => {
    if (!selectedWorkspace || !chatSettings) return

    setShowFilesDisplay(true)
    setUseRetrieval(true)

    if (file) {
      let simplifiedFileType = file.type.split("/")[1]

      // Reject image files when the selected model lacks imageInput support
      if (file.type.includes("image") && !supportsImageInput) {
        toast.error("The selected model does not support image uploads.")
        return
      }

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
        toast.error(
          "Unsupported file type. Supported: CSV, DOCX, JSON, MD, PDF, TXT"
        )
      }
    }
  }

  return {
    handleSelectDeviceFile,
    filesToAccept
  }
}
