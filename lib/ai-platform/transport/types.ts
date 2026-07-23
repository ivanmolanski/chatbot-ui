/**
 * Transport — Abstracts how the client communicates with the backend.
 *
 * The client never calls fetch() directly.
 * This enables swapping HTTP for WebSocket, gRPC, or mock transports.
 */

export interface ResponseWithHeaders<T> {
  data: T
  headers: Headers
}

export interface Transport {
  /**
   * Send a request and get a response with headers.
   * The canonical representation is response headers; there is no
   * VersionedResponse<T> wrapper — callers inspect the headers.
   */
  request<T>(params: RequestParams): Promise<ResponseWithHeaders<T>>

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
