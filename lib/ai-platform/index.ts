/**
 * AI Platform — Main exports
 *
 * The presentation layer imports ONLY from this file.
 * Nothing else.
 */

// Domain types
export type {
  Execution,
  ExecutionId,
  ExecutionType,
  ExecutionStatus,
  ExecutionInput,
  ExecutionConfig,
  Conversation,
  ConversationId,
  Message,
  Artifact,
  Citation,
  FileAttachment,
  UploadResult,
  PlatformCapabilities,
  PlatformError,
  PaginationParams,
  PaginatedResult
} from "./domain/types"

// Client interface
export type { AIPlatformClient, ExecuteParams } from "./client"
export { AIPlatformClientImpl } from "./client-impl"

// Transport
export type { Transport, RequestParams, StreamChunk } from "./transport/types"
export { HTTPTransport } from "./transport/http"

// Events
export type { ExecutionEvent, EventTypeMap } from "./events/types"
export { parseEventStream } from "./events/parser"

// Backend adapters
export type { BackendAdapter } from "./adapters/types"
export { AFDeepResearchAdapter } from "./adapters/af-deep-research"

// Rendering
export type { RendererRegistry, ComponentRenderer } from "./rendering/registry"
export { InMemoryRendererRegistry } from "./rendering/registry"
export {
  RendererRegistryProvider,
  useRendererRegistry
} from "./rendering/context"

// Auth
export type { AuthProvider } from "./auth/types"
export { NoAuth } from "./auth/no-auth"

// Jobs
export type { Job, JobStatus, JobHandle } from "./jobs/types"
export { ReconnectableStream } from "./jobs/reconnection"

// Protocol
export type { ProtocolVersions } from "./protocol/types"

// Config
export type { AIPlatformConfig } from "./config"
export { defaultConfig, createConfig } from "./config"
