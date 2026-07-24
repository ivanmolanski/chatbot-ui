/**
 * Assistant Files — Stub implementations for legacy file operations.
 *
 * Per ARCHITECTURE.md Phase 12: These are legacy functions from the
 * Supabase/DB layer. They are stubbed here to prevent build errors.
 * They will be replaced by the AI Platform adapter when the backend
 * supports assistant files natively.
 */

export async function createAssistantFile(file: any): Promise<any> {
  // TODO: Replace with AIPlatformClient.execute({ type: "agent", ... })
  console.warn("[legacy] createAssistantFile called")
  return { id: `file_${Date.now()}`, ...file }
}

export async function deleteAssistantFile(fileId: string): Promise<void> {
  // TODO: Replace with AIPlatformClient.execute({ type: "agent", ... })
  console.warn("[legacy] deleteAssistantFile called for:", fileId)
}

export async function getAssistantFilesByAssistantId(
  assistantId: string
): Promise<any[]> {
  // TODO: Replace with AIPlatformClient.execute({ type: "agent", ... })
  console.warn(
    "[legacy] getAssistantFilesByAssistantId called for:",
    assistantId
  )
  return []
}
