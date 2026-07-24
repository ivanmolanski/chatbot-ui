/**
 * Assistant Tools — Stub implementations for legacy tool operations.
 *
 * Per ARCHITECTURE.md Phase 12: These are legacy functions from the
 * Supabase/DB layer. They are stubbed here to prevent build errors.
 * They will be replaced by the AI Platform adapter when the backend
 * supports assistant tools natively.
 */

export async function createAssistantTool(tool: any): Promise<any> {
  // TODO: Replace with AIPlatformClient.execute({ type: "agent", ... })
  console.warn("[legacy] createAssistantTool called")
  return { id: `tool_${Date.now()}`, ...tool }
}

export async function deleteAssistantTool(toolId: string): Promise<void> {
  // TODO: Replace with AIPlatformClient.execute({ type: "agent", ... })
  console.warn("[legacy] deleteAssistantTool called for:", toolId)
}

export async function getAssistantToolsByAssistantId(
  assistantId: string
): Promise<any[]> {
  // TODO: Replace with AIPlatformClient.execute({ type: "agent", ... })
  console.warn(
    "[legacy] getAssistantToolsByAssistantId called for:",
    assistantId
  )
  return []
}
