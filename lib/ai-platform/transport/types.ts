/**
 * Transport — Abstracts how the client communicates with the backend.
 *
 * The client never calls fetch() directly.
 * This enables swapping HTTP for WebSocket, gRPC, or mock transports.
 */

export interface Transport {
  /**
   * Send a request and get a response.
   */
  request<T>(params: RequestParams): Promise<T>

  /**
   * Send a request and get a streaming response.
   */
  stream(params: RequestParams): AsyncIterable<StreamChunk>

  /**
   * Check if the transport is connected.
   */
  isConnected(): boolean

  /**
   * Close the transport.
   */
  close(): Promise<void>
}

export interface RequestParams {
  method: "GET" | "POST" | "PUT" | "DELETE"
  path: string
  query?: Record<string, string | number | boolean>
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
}

export interface StreamChunk {
  data: Uint8Array
  done: boolean
}
