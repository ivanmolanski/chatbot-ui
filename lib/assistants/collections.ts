/**
 * Assistant Collections — Proxy-backed CRUD for assistant-collection relations.
 *
 * Delegates to the /api/v1 proxy which forwards to the AF Deep Research
 * control plane. Per ARCHITECTURE.md Phase 12.
 */

const API_BASE = "/api/v1"
const DEFAULT_TIMEOUT_MS = 15000

async function proxyRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText)
      throw new Error(`Request failed (${res.status}): ${errorText}`)
    }

    if (res.status === 204) {
      return undefined as T
    }

    return res.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out")
    }
    throw error
  }
}

export async function createAssistantCollection(collection: any): Promise<any> {
  return proxyRequest<any>("/assistant-collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(collection)
  })
}

export async function deleteAssistantCollection(
  collectionId: string
): Promise<void> {
  await proxyRequest<void>(`/assistant-collections/${collectionId}`, {
    method: "DELETE"
  })
}

export async function getAssistantCollectionsByAssistantId(
  assistantId: string
): Promise<any[]> {
  const data = await proxyRequest<any>(`/assistants/${assistantId}/collections`)
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.collections)) return data.collections
  return []
}
