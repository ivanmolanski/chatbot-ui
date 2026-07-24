/**
 * Profile Limits — Constants for profile field validation.
 *
 * Per ARCHITECTURE.md Phase 12: These are constants from the old
 * Supabase/DB layer. They are defined here to prevent build errors.
 * These should be moved to the domain model or removed when the
 * backend handles validation.
 */

export const PROFILE_CONTEXT_MAX = 5000
export const PROFILE_DISPLAY_NAME_MAX = 100
export const PROFILE_USERNAME_MAX = 100
export const PROFILE_USERNAME_MIN = 2
