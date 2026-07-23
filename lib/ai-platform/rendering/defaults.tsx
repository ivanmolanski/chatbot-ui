/**
 * Default renderers — registered at app startup.
 * The backend can add new types without touching these.
 */

import type { RendererRegistry } from "./registry"

// Placeholder components — these will be implemented in the UI layer
const PlaceholderRenderer = ({ data }: { data: unknown }) => {
  const text =
    typeof data === "object" && data !== null && "text" in data
      ? (data as { text: string }).text
      : JSON.stringify(data)
  return <div className="text-muted-foreground text-sm">{text}</div>
}

export function registerDefaultRenderers(registry: RendererRegistry) {
  // Execution lifecycle
  registry.register("execution.started", { component: PlaceholderRenderer })
  registry.register("execution.completed", { component: PlaceholderRenderer })
  registry.register("execution.failed", { component: PlaceholderRenderer })

  // Status & progress
  registry.register("status.changed", { component: PlaceholderRenderer })
  registry.register("progress.updated", {
    component: PlaceholderRenderer,
    supportsStreaming: true
  })

  // Content
  registry.register("content.delta", {
    component: PlaceholderRenderer,
    supportsStreaming: true
  })
  registry.register("content.artifact", { component: PlaceholderRenderer })

  // Citations
  registry.register("citation.added", { component: PlaceholderRenderer })

  // Thinking & reasoning
  registry.register("thinking.delta", {
    component: PlaceholderRenderer,
    supportsStreaming: true
  })

  // Search & tools
  registry.register("search.completed", { component: PlaceholderRenderer })
  registry.register("tool.output", { component: PlaceholderRenderer })

  // Errors
  registry.register("error", { component: PlaceholderRenderer })
}
