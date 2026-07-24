/**
 * Assistant Collections — Proxy-backed CRUD for assistant-collection relations.
 *
 * Delegates to the /api/v1 proxy which forwards to the AF Deep Research
 * control plane. Per ARCHITECTURE.md Phase 12.
 */

const API_BASE = "/api/v1"

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
  collectionId: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/assistant-collections/${collectionId}`, {
    method: "DELETE"
  })
  if (!res.ok) throw new Error("Failed to delete assistant collection")
}

export async function getAssistantCollectionsByAssistantId(
  assistantId: string
): Promise<any[]> {
  const res = await fetch(`${API_BASE}/assistants/${assistantId}/collections`)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : data.collections || []
}
