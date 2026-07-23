/**
 * ExecutionRenderer — Renders any execution event using the registry.
 * No hardcoded event types. No switch statements.
 */

"use client"

import { useRendererRegistry } from "@/lib/ai-platform/rendering/context"
import type { ExecutionEvent } from "@/lib/ai-platform/events/types"

interface ExecutionRendererProps {
  event: ExecutionEvent
}

export function ExecutionRenderer({ event }: ExecutionRendererProps) {
  const registry = useRendererRegistry()
  const renderer = registry.get(event.type)

  if (!renderer) {
    // Unknown event type — render nothing or a fallback
    return null
  }

  const Component = renderer.component
  return (
    <Component
      data={event.data}
      metadata={{ executionId: event.executionid }}
    />
  )
}
