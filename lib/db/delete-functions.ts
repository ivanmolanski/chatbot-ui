/**
 * Delete Functions — CRUD operations for deleting items via proxy.
 *
 * Per ARCHITECTURE.md Phase 12: These functions were part of the Supabase/DB layer.
 * They are now implemented as proxy calls to the AF Deep Research control plane.
 * The backend handles persistence; the UI is a thin presentation layer.
 */

const API_BASE = "/api/v1"

// ── Chat Deletion ──────────────────────────────────────────────

export async function deleteChat(chatId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    method: "DELETE"
  })
  if (!res.ok) throw new Error("Failed to delete chat")
}

// ── Preset Deletion ────────────────────────────────────────────

export async function deletePreset(presetId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/presets/${presetId}`, {
    method: "DELETE"
  })
  if (!res.ok) throw new Error("Failed to delete preset")
}

// ── Prompt Deletion ────────────────────────────────────────────

export async function deletePrompt(promptId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/prompts/${promptId}`, {
    method: "DELETE"
  })
  if (!res.ok) throw new Error("Failed to delete prompt")
}

// ── File Deletion ──────────────────────────────────────────────

export async function deleteFile(fileId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/files/${fileId}`, {
    method: "DELETE"
  })
  if (!res.ok) throw new Error("Failed to delete file")
}

export async function deleteFileFromStorage(filePath: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/files/storage/${encodeURIComponent(filePath)}`,
    {
      method: "DELETE"
    }
  )
  if (!res.ok) throw new Error("Failed to delete file from storage")
}

// ── Collection Deletion ────────────────────────────────────────

export async function deleteCollection(collectionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/collections/${collectionId}`, {
    method: "DELETE"
  })
  if (!res.ok) throw new Error("Failed to delete collection")
}

// ── Assistant Deletion ─────────────────────────────────────────

export async function deleteAssistant(assistantId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/assistants/${assistantId}`, {
    method: "DELETE"
  })
  if (!res.ok) throw new Error("Failed to delete assistant")
}

// ── Tool Deletion ──────────────────────────────────────────────

export async function deleteTool(toolId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tools/${toolId}`, {
    method: "DELETE"
  })
  if (!res.ok) throw new Error("Failed to delete tool")
}

// ── Model Deletion ─────────────────────────────────────────────

export async function deleteModel(modelId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/models/${modelId}`, {
    method: "DELETE"
  })
  if (!res.ok) throw new Error("Failed to delete model")
}

// ── Workspace Deletion ─────────────────────────────────────────

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}`, {
    method: "DELETE"
  })
  if (!res.ok) throw new Error("Failed to delete workspace")
}
