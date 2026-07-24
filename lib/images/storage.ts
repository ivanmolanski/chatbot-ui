/**
 * Image Storage — Proxy-backed image operations.
 *
 * Delegates to the /api/v1 proxy which forwards to the AF Deep Research
 * control plane. Per ARCHITECTURE.md Phase 12.
 */

const API_BASE = "/api/v1"

export async function getAssistantImageFromStorage(
  path: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${API_BASE}/images/assistant/${encodeURIComponent(path)}`
    )
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

export async function getWorkspaceImageFromStorage(
  path: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${API_BASE}/images/workspace/${encodeURIComponent(path)}`
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.url || null
  } catch {
    return null
  }
}

export async function uploadWorkspaceImage(
  workspace: { id: string },
  file: File
): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("workspace_id", workspace.id)

  const res = await fetch(`${API_BASE}/images/workspace`, {
    method: "POST",
    body: formData
  })
  if (!res.ok) throw new Error("Failed to upload workspace image")
  const data = await res.json()
  return data.path
}
