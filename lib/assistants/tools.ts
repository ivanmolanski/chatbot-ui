/**
 * Assistant Tools — Proxy-backed CRUD for assistant-tool relations.
 *
 * Delegates to the /api/v1 proxy which forwards to the AF Deep Research
 * control plane. Per ARCHITECTURE.md Phase 12.
 */

const API_BASE = "/api/v1"

export async function createAssistantTool(tool: any): Promise<any> {
  const res = await fetch(`${API_BASE}/assistant-tools`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tool)
  })
  if (!res.ok) throw new Error("Failed to create assistant tool")
  return res.json()
}

export async function deleteAssistantTool(toolId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/assistant-tools/${toolId}`, {
    method: "DELETE"
  })
  if (!res.ok) throw new Error("Failed to delete assistant tool")
}

export async function getAssistantToolsByAssistantId(
  assistantId: string
): Promise<any[]> {
  const res = await fetch(`${API_BASE}/assistants/${assistantId}/tools`)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : data.tools || []
}
