/**
 * NoAuth — No authentication (development / trusted network).
 */

import type { AuthProvider } from "./types"

export class NoAuth implements AuthProvider {
  async getToken(): Promise<string | null> {
    return null
  }

  isAuthenticated(): boolean {
    return true // Always authenticated in no-auth mode
  }

  onAuthStateChange(callback: (authenticated: boolean) => void): () => void {
    callback(true)
    return () => {}
  }

  async login(): Promise<void> {
    // No-op
  }

  async logout(): Promise<void> {
    // No-op
  }

  async getUser(): Promise<{
    id: string
    email?: string
    name?: string
  } | null> {
    return { id: "anonymous", name: "Anonymous User" }
  }
}
