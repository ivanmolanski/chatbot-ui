/**
 * Workspace Items — CRUD operations for workspace-managed entities.
 *
 * Per ARCHITECTURE.md Phase 12: These functions were part of the Supabase/DB layer.
 * They are now implemented as proxy calls to the AF Deep Research control plane.
 * The backend handles persistence; the UI is a thin presentation layer.
 */

import { ChatbotUIContext } from "@/context/context"

const API_BASE = "/api/v1"

// ── Assistant Collections ──────────────────────────────────────

export async function createAssistantCollection(collection: any): Promise<any> {
  const res = await fetch(`${API_BASE}/assistant-collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(collection)
  })
  if (!res.ok) throw new Error("Failed to create assistant collection")
  return res.json()
}

export async function deleteAssistantCollection(
  assistantId: string,
  collectionId: string
): Promise<boolean> {
  const res = await fetch(
    `${API_BASE}/assistant-collections/${assistantId}/${collectionId}`,
    {
      method: "DELETE"
    }
  )
  return res.ok
}

export async function getAssistantCollectionsByAssistantId(
  assistantId: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/assistants/${assistantId}/collections`)
  if (!res.ok) return { collections: [] }
  const data = await res.json()
  return { collections: Array.isArray(data) ? data : data.collections || [] }
}

// ── Assistant Files ────────────────────────────────────────────

export async function createAssistantFile(file: any): Promise<any> {
  const res = await fetch(`${API_BASE}/assistant-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(file)
  })
  if (!res.ok) throw new Error("Failed to create assistant file")
  return res.json()
}

export async function deleteAssistantFile(
  assistantId: string,
  fileId: string
): Promise<boolean> {
  const res = await fetch(
    `${API_BASE}/assistant-files/${assistantId}/${fileId}`,
    {
      method: "DELETE"
    }
  )
  return res.ok
}

export async function getAssistantFilesByAssistantId(
  assistantId: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/assistants/${assistantId}/files`)
  if (!res.ok) return { files: [] }
  const data = await res.json()
  return { files: Array.isArray(data) ? data : data.files || [] }
}

// ── Assistant Tools ────────────────────────────────────────────

export async function createAssistantTool(tool: any): Promise<any> {
  const res = await fetch(`${API_BASE}/assistant-tools`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tool)
  })
  if (!res.ok) throw new Error("Failed to create assistant tool")
  return res.json()
}

export async function deleteAssistantTool(
  assistantId: string,
  toolId: string
): Promise<boolean> {
  const res = await fetch(
    `${API_BASE}/assistant-tools/${assistantId}/${toolId}`,
    {
      method: "DELETE"
    }
  )
  return res.ok
}

export async function getAssistantToolsByAssistantId(
  assistantId: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/assistants/${assistantId}/tools`)
  if (!res.ok) return { tools: [] }
  const data = await res.json()
  return { tools: Array.isArray(data) ? data : data.tools || [] }
}

// ── Assistant Workspaces ───────────────────────────────────────

export async function createAssistantWorkspaces(
  assistantWorkspaces: any
): Promise<any> {
  const res = await fetch(`${API_BASE}/assistant-workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(assistantWorkspaces)
  })
  if (!res.ok) throw new Error("Failed to create assistant workspaces")
  return res.json()
}

export async function deleteAssistantWorkspace(
  assistantWorkspaceId: string
): Promise<boolean> {
  const res = await fetch(
    `${API_BASE}/assistant-workspaces/${assistantWorkspaceId}`,
    {
      method: "DELETE"
    }
  )
  return res.ok
}

export async function getAssistantWorkspacesByAssistantId(
  assistantId: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/assistants/${assistantId}/workspaces`)
  if (!res.ok) return { workspaces: [] }
  const data = await res.json()
  return { workspaces: Array.isArray(data) ? data : data.workspaces || [] }
}

// ── Collection Files ───────────────────────────────────────────

export async function createCollectionFile(collectionFile: any): Promise<any> {
  const res = await fetch(`${API_BASE}/collection-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(collectionFile)
  })
  if (!res.ok) throw new Error("Failed to create collection file")
  return res.json()
}

export async function deleteCollectionFile(
  collectionId: string,
  fileId: string
): Promise<boolean> {
  const res = await fetch(
    `${API_BASE}/collection-files/${collectionId}/${fileId}`,
    {
      method: "DELETE"
    }
  )
  return res.ok
}

export async function getCollectionFilesByCollectionId(
  collectionId: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/collections/${collectionId}/files`)
  if (!res.ok) return { files: [] }
  const data = await res.json()
  return { files: Array.isArray(data) ? data : data.files || [] }
}

// ── Collection Workspaces ──────────────────────────────────────

export async function createCollectionWorkspaces(
  collectionWorkspaces: any
): Promise<any> {
  const res = await fetch(`${API_BASE}/collection-workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(collectionWorkspaces)
  })
  if (!res.ok) throw new Error("Failed to create collection workspaces")
  return res.json()
}

export async function deleteCollectionWorkspace(
  collectionWorkspaceId: string
): Promise<boolean> {
  const res = await fetch(
    `${API_BASE}/collection-workspaces/${collectionWorkspaceId}`,
    {
      method: "DELETE"
    }
  )
  return res.ok
}

export async function getCollectionWorkspacesByCollectionId(
  collectionId: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/collections/${collectionId}/workspaces`)
  if (!res.ok) return { workspaces: [] }
  const data = await res.json()
  return { workspaces: Array.isArray(data) ? data : data.workspaces || [] }
}

// ── File Workspaces ────────────────────────────────────────────

export async function createFileWorkspaces(fileWorkspaces: any): Promise<any> {
  const res = await fetch(`${API_BASE}/file-workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fileWorkspaces)
  })
  if (!res.ok) throw new Error("Failed to create file workspaces")
  return res.json()
}

export async function deleteFileWorkspace(
  fileWorkspaceId: string
): Promise<boolean> {
  const res = await fetch(`${API_BASE}/file-workspaces/${fileWorkspaceId}`, {
    method: "DELETE"
  })
  return res.ok
}

export async function getFileWorkspacesByFileId(fileId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/files/${fileId}/workspaces`)
  if (!res.ok) return { workspaces: [] }
  const data = await res.json()
  return { workspaces: Array.isArray(data) ? data : data.workspaces || [] }
}

// ── Model Workspaces ───────────────────────────────────────────

export async function createModelWorkspaces(
  modelWorkspaces: any
): Promise<any> {
  const res = await fetch(`${API_BASE}/model-workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(modelWorkspaces)
  })
  if (!res.ok) throw new Error("Failed to create model workspaces")
  return res.json()
}

export async function deleteModelWorkspace(
  modelWorkspaceId: string
): Promise<boolean> {
  const res = await fetch(`${API_BASE}/model-workspaces/${modelWorkspaceId}`, {
    method: "DELETE"
  })
  return res.ok
}

export async function getModelWorkspacesByModelId(
  modelId: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/models/${modelId}/workspaces`)
  if (!res.ok) return { workspaces: [] }
  const data = await res.json()
  return { workspaces: Array.isArray(data) ? data : data.workspaces || [] }
}

// ── Preset Workspaces ──────────────────────────────────────────

export async function createPresetWorkspaces(
  presetWorkspaces: any
): Promise<any> {
  const res = await fetch(`${API_BASE}/preset-workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(presetWorkspaces)
  })
  if (!res.ok) throw new Error("Failed to create preset workspaces")
  return res.json()
}

export async function deletePresetWorkspace(
  presetWorkspaceId: string
): Promise<boolean> {
  const res = await fetch(
    `${API_BASE}/preset-workspaces/${presetWorkspaceId}`,
    {
      method: "DELETE"
    }
  )
  return res.ok
}

export async function getPresetWorkspacesByPresetId(
  presetId: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/presets/${presetId}/workspaces`)
  if (!res.ok) return { workspaces: [] }
  const data = await res.json()
  return { workspaces: Array.isArray(data) ? data : data.workspaces || [] }
}

// ── Prompt Workspaces ──────────────────────────────────────────

export async function createPromptWorkspaces(
  promptWorkspaces: any
): Promise<any> {
  const res = await fetch(`${API_BASE}/prompt-workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(promptWorkspaces)
  })
  if (!res.ok) throw new Error("Failed to create prompt workspaces")
  return res.json()
}

export async function deletePromptWorkspace(
  promptWorkspaceId: string
): Promise<boolean> {
  const res = await fetch(
    `${API_BASE}/prompt-workspaces/${promptWorkspaceId}`,
    {
      method: "DELETE"
    }
  )
  return res.ok
}

export async function getPromptWorkspacesByPromptId(
  promptId: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/prompts/${promptId}/workspaces`)
  if (!res.ok) return { workspaces: [] }
  const data = await res.json()
  return { workspaces: Array.isArray(data) ? data : data.workspaces || [] }
}

// ── Tool Workspaces ────────────────────────────────────────────

export async function createToolWorkspaces(toolWorkspaces: any): Promise<any> {
  const res = await fetch(`${API_BASE}/tool-workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toolWorkspaces)
  })
  if (!res.ok) throw new Error("Failed to create tool workspaces")
  return res.json()
}

export async function deleteToolWorkspace(
  toolWorkspaceId: string
): Promise<boolean> {
  const res = await fetch(`${API_BASE}/tool-workspaces/${toolWorkspaceId}`, {
    method: "DELETE"
  })
  return res.ok
}

export async function getToolWorkspacesByToolId(toolId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/tools/${toolId}/workspaces`)
  if (!res.ok) return { workspaces: [] }
  const data = await res.json()
  return { workspaces: Array.isArray(data) ? data : data.workspaces || [] }
}

// ── Generic Update ─────────────────────────────────────────────

export async function updateChat(id: string, data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/chats/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error("Failed to update chat")
  return res.json()
}

export async function updateAssistant(id: string, data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/assistants/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error("Failed to update assistant")
  return res.json()
}

export async function updateCollection(id: string, data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/collections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error("Failed to update collection")
  return res.json()
}

export async function updateFile(id: string, data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/files/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error("Failed to update file")
  return res.json()
}

export async function updateModel(id: string, data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/models/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error("Failed to update model")
  return res.json()
}

export async function updatePreset(id: string, data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/presets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error("Failed to update preset")
  return res.json()
}

export async function updatePrompt(id: string, data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/prompts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error("Failed to update prompt")
  return res.json()
}

export async function updateTool(id: string, data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/tools/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error("Failed to update tool")
  return res.json()
}
