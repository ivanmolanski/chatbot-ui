/**
 * Assistant Files — Proxy-backed CRUD for assistant-file relations.
 *
 * Delegates to the /api/v1 proxy which forwards to the AF Deep Research
 * control plane. Per ARCHITECTURE.md Phase 12.
 */

const API_BASE = "/api/v1"

export async function createAssistantFile(file: any): Promise<any> {
  const res = await fetch(`${API_BASE}/assistant-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(file)
  })
  if (!res.ok) throw new Error("Failed to create assistant file")
  return res.json()
}

export async function deleteAssistantFile(fileId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/assistant-files/${fileId}`, {
    method: "DELETE"
  })
  if (!res.ok) throw new Error("Failed to delete assistant file")
}

export async function getAssistantFilesByAssistantId(
  assistantId: string
): Promise<any[]> {
  const res = await fetch(`${API_BASE}/assistants/${assistantId}/files`)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : data.files || []
}
