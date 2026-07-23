/**
 * AuthProvider — Abstracts authentication.
 *
 * The UI does not know whether authentication comes from:
 * - JWT
 * - Clerk
 * - Auth.js
 * - Railway
 * - Cloudflare
 * - Internal gateway
 */

export interface AuthProvider {
  /**
   * Get the current auth token (or null if not authenticated).
   */
  getToken(): Promise<string | null>

  /**
   * Whether the user is currently authenticated.
   */
  isAuthenticated(): boolean

  /**
   * Subscribe to auth state changes.
   * Returns an unsubscribe function.
   */
  onAuthStateChange(callback: (authenticated: boolean) => void): () => void

  /**
   * Initiate login (redirects or opens modal).
   */
  login(): Promise<void>

  /**
   * Log out and clear session.
   */
  logout(): Promise<void>

  /**
   * Get current user info.
   */
  getUser(): Promise<{
    id: string
    email?: string
    name?: string
  } | null>
}
