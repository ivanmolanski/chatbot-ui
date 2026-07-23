/**
 * React context for the RendererRegistry.
 */

"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import { RendererRegistry, InMemoryRendererRegistry } from "./registry"
import { registerDefaultRenderers } from "./defaults"

const RendererRegistryContext = createContext<RendererRegistry | null>(null)

export function RendererRegistryProvider({
  children
}: {
  children: ReactNode
}) {
  const [registry] = useState<RendererRegistry>(() => {
    const r = new InMemoryRendererRegistry()
    registerDefaultRenderers(r)
    return r
  })

  return (
    <RendererRegistryContext.Provider value={registry}>
      {children}
    </RendererRegistryContext.Provider>
  )
}

export function useRendererRegistry(): RendererRegistry {
  const registry = useContext(RendererRegistryContext)
  if (!registry) {
    throw new Error(
      "useRendererRegistry must be used within RendererRegistryProvider"
    )
  }
  return registry
}
