/**
 * Create Functions — CRUD operations for creating items via proxy.
 *
 * Per ARCHITECTURE.md Phase 12: These functions were part of the Supabase/DB layer.
 * They are now implemented as proxy calls to the AF Deep Research control plane.
 * The backend handles persistence; the UI is a thin presentation layer.
 */

const API_BASE = "/api/v1"

// ── Chat Creation ──────────────────────────────────────────────

export async function createChat(chat: any, workspaceId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...chat, workspace_id: workspaceId })
  })
  if (!res.ok) throw new Error("Failed to create chat")
  return res.json()
}

// ── Preset Creation ────────────────────────────────────────────

export async function createPreset(
  preset: any,
  workspaceId: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/presets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...preset, workspace_id: workspaceId })
  })
  if (!res.ok) throw new Error("Failed to create preset")
  return res.json()
}

// ── Prompt Creation ────────────────────────────────────────────

export async function createPrompt(
  prompt: any,
  workspaceId: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/prompts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...prompt, workspace_id: workspaceId })
  })
  if (!res.ok) throw new Error("Failed to create prompt")
  return res.json()
}

// ── File Creation ──────────────────────────────────────────────

export async function createFileBasedOnExtension(
  file: File,
  rest: any,
  workspaceId: string,
  embeddingsProvider: "openai" | "local"
): Promise<any> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("workspace_id", workspaceId)
  formData.append("embeddings_provider", embeddingsProvider)
  Object.entries(rest).forEach(([key, value]) => {
    formData.append(key, String(value))
  })

  const res = await fetch(`${API_BASE}/files`, {
    method: "POST",
    body: formData
  })
  if (!res.ok) throw new Error("Failed to create file")
  return res.json()
}

// ── Collection Creation ────────────────────────────────────────

export async function createCollection(
  collection: any,
  workspaceId: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...collection, workspace_id: workspaceId })
  })
  if (!res.ok) throw new Error("Failed to create collection")
  return res.json()
}

export async function createCollectionFiles(files: any[]): Promise<void> {
  const res = await fetch(`${API_BASE}/collection-files/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(files)
  })
  if (!res.ok) throw new Error("Failed to create collection files")
}

// ── Assistant Creation ─────────────────────────────────────────

export async function createAssistant(
  assistant: any,
  workspaceId: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/assistants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...assistant, workspace_id: workspaceId })
  })
  if (!res.ok) throw new Error("Failed to create assistant")
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

// ── Assistant Files/Collections/Tools ──────────────────────────

export async function createAssistantFiles(files: any[]): Promise<void> {
  const res = await fetch(`${API_BASE}/assistant-files/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(files)
  })
  if (!res.ok) throw new Error("Failed to create assistant files")
}

export async function createAssistantCollections(
  collections: any[]
): Promise<void> {
  const res = await fetch(`${API_BASE}/assistant-collections/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(collections)
  })
  if (!res.ok) throw new Error("Failed to create assistant collections")
}

export async function createAssistantTools(tools: any[]): Promise<void> {
  const res = await fetch(`${API_BASE}/assistant-tools/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tools)
  })
  if (!res.ok) throw new Error("Failed to create assistant tools")
}

// ── Tool Creation ──────────────────────────────────────────────

export async function createTool(tool: any, workspaceId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/tools`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...tool, workspace_id: workspaceId })
  })
  if (!res.ok) throw new Error("Failed to create tool")
  return res.json()
}

// ── Model Creation ─────────────────────────────────────────────

export async function createModel(
  model: any,
  workspaceId: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...model, workspace_id: workspaceId })
  })
  if (!res.ok) throw new Error("Failed to create model")
  return res.json()
}

// ── Profile Image Upload ───────────────────────────────────────

export async function uploadProfileImage(
  profile: any,
  file: File
): Promise<{ path: string; url: string }> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("profile_id", profile.id)

  const res = await fetch(`${API_BASE}/images/profile`, {
    method: "POST",
    body: formData
  })
  if (!res.ok) throw new Error("Failed to upload profile image")
  const data = await res.json()
  return { path: data.path, url: data.url }
}

// ── Profile Update ─────────────────────────────────────────────

export async function updateProfile(id: string, data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/profiles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error("Failed to update profile")
  return res.json()
}

// ── User Update ────────────────────────────────────────────────

export async function updateUser(id: string, data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error("Failed to update user")
  return res.json()
}

// ── Export Functions ───────────────────────────────────────────

export function exportLocalStorageAsJSON(): void {
  // Export all localStorage data as JSON
  const data: Record<string, any> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key) || "")
      } catch {
        data[key] = localStorage.getItem(key)
      }
    }
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `af-deep-research-export-${new Date().toISOString().split("T")[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Batch Creation ─────────────────────────────────────────────

export async function createChats(chats: any[]): Promise<any[]> {
  const results = []
  for (const chat of chats) {
    const created = await createChat(chat, chat.workspace_id)
    results.push(created)
  }
  return results
}

export async function createPresets(
  presets: any[],
  workspaceId: string
): Promise<any[]> {
  const results = []
  for (const preset of presets) {
    const created = await createPreset(preset, workspaceId)
    results.push(created)
  }
  return results
}

export async function createPrompts(
  prompts: any[],
  workspaceId: string
): Promise<any[]> {
  const results = []
  for (const prompt of prompts) {
    const created = await createPrompt(prompt, workspaceId)
    results.push(created)
  }
  return results
}

export async function createFiles(
  files: any[],
  workspaceId: string
): Promise<any[]> {
  const results = []
  for (const file of files) {
    const created = await createFileBasedOnExtension(
      file.file,
      file,
      workspaceId,
      "openai"
    )
    results.push(created)
  }
  return results
}

export async function createCollections(
  collections: any[],
  workspaceId: string
): Promise<any[]> {
  const results = []
  for (const collection of collections) {
    const created = await createCollection(collection, workspaceId)
    results.push(created)
  }
  return results
}

export async function createAssistants(
  assistants: any[],
  workspaceId: string
): Promise<any[]> {
  const results = []
  for (const assistant of assistants) {
    const created = await createAssistant(assistant, workspaceId)
    results.push(created)
  }
  return results
}

export async function createTools(
  tools: any[],
  workspaceId: string
): Promise<any[]> {
  const results = []
  for (const tool of tools) {
    const created = await createTool(tool, workspaceId)
    results.push(created)
  }
  return results
}

// ── Folder Creation ────────────────────────────────────────────

export async function createFolder(folder: any): Promise<any> {
  const res = await fetch(`${API_BASE}/folders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(folder)
  })
  if (!res.ok) throw new Error("Failed to create folder")
  return res.json()
}

// ── Workspace Creation ─────────────────────────────────────────

export async function createWorkspace(workspace: any): Promise<any> {
  const res = await fetch(`${API_BASE}/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(workspace)
  })
  if (!res.ok) throw new Error("Failed to create workspace")
  return res.json()
}

// ── Profile Creation ───────────────────────────────────────────

export async function createProfile(profile: any): Promise<any> {
  const res = await fetch(`${API_BASE}/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile)
  })
  if (!res.ok) throw new Error("Failed to create profile")
  return res.json()
}

// ── Image Storage ──────────────────────────────────────────────

export async function getAssistantImageFromStorage(
  path: string
): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/images/assistant/${path}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.url || null
  } catch {
    return null
  }
}

export async function uploadAssistantImage(
  assistant: { id: string },
  file: File
): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("assistant_id", assistant.id)

  const res = await fetch(`${API_BASE}/images/assistant`, {
    method: "POST",
    body: formData
  })
  if (!res.ok) throw new Error("Failed to upload assistant image")
  const data = await res.json()
  return data.path
}

// ── Utility ────────────────────────────────────────────────────

export function convertBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
