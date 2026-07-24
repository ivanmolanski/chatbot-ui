/**
 * Image Storage — Proxy-backed image operations.
 *
 * Delegates to the /api/v1 proxy which forwards to the AF Deep Research
 * control plane. Per ARCHITECTURE.md Phase 12.
 */

const API_BASE = "/api/v1"
const DEFAULT_TIMEOUT_MS = 30000

async function uploadImage(
  endpoint: string,
  formField: string,
  entityId: string,
  file: File
): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const formData = new FormData()
    formData.append(formField, file)
    formData.append(`${formField}_id`, entityId)

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      body: formData,
      signal: controller.signal
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText)
      throw new Error(`Upload failed (${res.status}): ${errorText}`)
    }

    const data = await res.json()
    if (
      !data.path ||
      typeof data.path !== "string" ||
      data.path.trim() === ""
    ) {
      throw new Error("Upload response missing or invalid path")
    }
    return data.path
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Upload timed out")
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

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
  return uploadImage("/images/assistant", "assistant", assistant.id, file)
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
  return uploadImage("/images/workspace", "workspace", workspace.id, file)
}
