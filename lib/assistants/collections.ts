/**
 * Assistant Collections — Stub implementations for legacy collection operations.
 *
 * Per ARCHITECTURE.md Phase 12: These are legacy functions from the
 * Supabase/DB layer. They are stubbed here to prevent build errors.
 * They will be replaced by the AI Platform adapter when the backend
 * supports assistant collections natively.
 */

export async function createAssistantCollection(collection: any): Promise<any> {
  // TODO: Replace with AIPlatformClient.execute({ type: "agent", ... })
  console.warn("[legacy] createAssistantCollection called")
  return { id: `col_${Date.now()}`, ...collection }
}

export async function deleteAssistantCollection(
  collectionId: string
): Promise<void> {
  // TODO: Replace with AIPlatformClient.execute({ type: "agent", ... })
  console.warn("[legacy] deleteAssistantCollection called for:", collectionId)
}

export async function getAssistantCollectionsByAssistantId(
  assistantId: string
): Promise<any[]> {
  // TODO: Replace with AIPlatformClient.execute({ type: "agent", ... })
  console.warn(
    "[legacy] getAssistantCollectionsByAssistantId called for:",
    assistantId
  )
  return []
}
