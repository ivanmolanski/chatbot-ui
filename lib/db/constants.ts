/**
 * Database Constants — Validation limits for entity fields.
 *
 * Per ARCHITECTURE.md Phase 12: These constants were part of the Supabase/DB layer.
 * They are defined here to prevent build errors.
 * These should be moved to the domain model or removed when the
 * backend handles validation.
 */

// ── Profile Constants ──────────────────────────────────────────

export const PROFILE_CONTEXT_MAX = 5000
export const PROFILE_DISPLAY_NAME_MAX = 100
export const PROFILE_USERNAME_MAX = 100
export const PROFILE_USERNAME_MIN = 2

// ── Assistant Constants ────────────────────────────────────────

export const ASSISTANT_NAME_MAX = 100
export const ASSISTANT_DESCRIPTION_MAX = 500
export const ASSISTANT_INSTRUCTIONS_MAX = 5000

// ── Collection Constants ───────────────────────────────────────

export const COLLECTION_NAME_MAX = 100
export const COLLECTION_DESCRIPTION_MAX = 500

// ── File Constants ─────────────────────────────────────────────

export const FILE_NAME_MAX = 100
export const FILE_DESCRIPTION_MAX = 500

// ── Tool Constants ─────────────────────────────────────────────

export const TOOL_NAME_MAX = 100
export const TOOL_DESCRIPTION_MAX = 500

// ── Model Constants ────────────────────────────────────────────

export const MODEL_NAME_MAX = 100
export const MODEL_DESCRIPTION_MAX = 500

// ── Preset Constants ───────────────────────────────────────────

export const PRESET_NAME_MAX = 100
export const PRESET_DESCRIPTION_MAX = 500

// ── Prompt Constants ───────────────────────────────────────────

export const PROMPT_NAME_MAX = 100
export const PROMPT_CONTENT_MAX = 10000

// ── Workspace Constants ────────────────────────────────────────

export const WORKSPACE_NAME_MAX = 100
export const WORKSPACE_DESCRIPTION_MAX = 500
export const WORKSPACE_INSTRUCTIONS_MAX = 5000

// ── Chat Constants ─────────────────────────────────────────────

export const CHAT_NAME_MAX = 100
