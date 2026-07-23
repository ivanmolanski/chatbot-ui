/**
 * RendererRegistry — Pluggable rendering system.
 *
 * The backend can invent new artifact types. The frontend renders them
 * via registered renderers. No frontend rewrite needed.
 */

import type { ComponentType } from "react"

export interface ComponentRenderer {
  component: ComponentType<{
    data: unknown
    metadata?: Record<string, unknown>
  }>
  priority?: number
  supportsStreaming?: boolean
}

export interface RendererRegistry {
  register(type: string, renderer: ComponentRenderer): void
  get(type: string): ComponentRenderer | null
  getRegisteredTypes(): string[]
}

export class InMemoryRendererRegistry implements RendererRegistry {
  private renderers = new Map<string, ComponentRenderer>()

  register(type: string, renderer: ComponentRenderer): void {
    const existing = this.renderers.get(type)
    if (existing && (existing.priority || 0) > (renderer.priority || 0)) {
      return // Higher priority wins
    }
    this.renderers.set(type, renderer)
  }

  get(type: string): ComponentRenderer | null {
    return this.renderers.get(type) || null
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.renderers.keys())
  }
}
