/**
 * AI Platform Context Provider
 *
 * Initializes the AIPlatformClient and makes it available to the app.
 * Replaces the old Supabase-dependent global state.
 */

"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from "react"
import type { AIPlatformClient } from "@/lib/ai-platform/client"
import { AIPlatformClientImpl } from "@/lib/ai-platform/client-impl"
import { HTTPTransport } from "@/lib/ai-platform/transport/http"
import { AFDeepResearchAdapter } from "@/lib/ai-platform/adapters/af-deep-research"
import { NoAuth } from "@/lib/ai-platform/auth/no-auth"
import { InMemoryRendererRegistry } from "@/lib/ai-platform/rendering/registry"
import { registerDefaultRenderers } from "@/lib/ai-platform/rendering/defaults"

interface AIPlatformContextValue {
  client: AIPlatformClient
  registry: InMemoryRendererRegistry
  isReady: boolean
}

const AIPlatformContext = createContext<AIPlatformContextValue | null>(null)

interface AIPlatformProviderProps {
  children: ReactNode
}

export function AIPlatformProvider({ children }: AIPlatformProviderProps) {
  const [client, setClient] = useState<AIPlatformClient | null>(null)
  const [registry] = useState(() => {
    const r = new InMemoryRendererRegistry()
    registerDefaultRenderers(r)
    return r
  })

  useEffect(() => {
    // Initialize the client
    const transport = new HTTPTransport("/api/v1")
    const adapter = new AFDeepResearchAdapter()
    const auth = new NoAuth()

    const platformClient = new AIPlatformClientImpl(transport, adapter)
    setClient(platformClient)
  }, [])

  if (!client) {
    return <div>Loading AI Platform...</div>
  }

  return (
    <AIPlatformContext.Provider value={{ client, registry, isReady: true }}>
      {children}
    </AIPlatformContext.Provider>
  )
}

export function useAIPlatform(): AIPlatformContextValue {
  const context = useContext(AIPlatformContext)
  if (!context) {
    throw new Error("useAIPlatform must be used within AIPlatformProvider")
  }
  return context
}
