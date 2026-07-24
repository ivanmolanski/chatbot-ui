/**
 * Image Storage — Stub implementations for legacy image operations.
 *
 * Per ARCHITECTURE.md Phase 12: These are legacy functions from the
 * Supabase/DB layer. They are stubbed here to prevent build errors.
 * They will be replaced by the AI Platform adapter when the backend
 * supports file uploads natively.
 */

export async function getAssistantImageFromStorage(
  path: string
): Promise<string | null> {
  // TODO: Replace with AIPlatformClient.uploadFile() when backend supports it
  console.warn("[legacy] getAssistantImageFromStorage called with:", path)
  return null
}

export async function uploadAssistantImage(
  assistant: { id: string },
  file: File
): Promise<string> {
  // TODO: Replace with AIPlatformClient.uploadFile() when backend supports it
  console.warn("[legacy] uploadAssistantImage called for:", assistant.id)
  return `assistant-images/${assistant.id}/${file.name}`
}

export async function getWorkspaceImageFromStorage(
  path: string
): Promise<string | null> {
  // TODO: Replace with AIPlatformClient.uploadFile() when backend supports it
  console.warn("[legacy] getWorkspaceImageFromStorage called with:", path)
  return null
}

export async function uploadWorkspaceImage(
  workspace: { id: string },
  file: File
): Promise<string> {
  // TODO: Replace with AIPlatformClient.uploadFile() when backend supports it
  console.warn("[legacy] uploadWorkspaceImage called for:", workspace.id)
  return `workspace-images/${workspace.id}/${file.name}`
}
