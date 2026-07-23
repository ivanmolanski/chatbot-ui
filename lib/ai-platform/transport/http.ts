/**
 * HTTP + SSE Transport Implementation
 *
 * Initial implementation using fetch() + ReadableStream.
 * The client never calls fetch() directly — it uses this transport.
 */

import type { Transport, RequestParams, StreamChunk } from "./types"

export class HTTPTransport implements Transport {
  private baseUrl: string
  private headers: Record<string, string>

  constructor(baseUrl: string, headers: Record<string, string> = {}) {
    this.baseUrl = baseUrl
    this.headers = headers
  }

  async request<T>(params: RequestParams): Promise<T> {
    const url = this.buildUrl(params)
    const response = await fetch(url, {
      method: params.method,
      headers: {
        "Content-Type": "application/json",
        ...this.headers,
        ...params.headers
      },
      body:
        params.method !== "GET" && params.method !== "DELETE"
          ? JSON.stringify(params.body)
          : undefined,
      signal: params.signal
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  async *stream(params: RequestParams): AsyncIterable<StreamChunk> {
    const url = this.buildUrl(params)
    const response = await fetch(url, {
      method: params.method,
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...this.headers,
        ...params.headers
      },
      body:
        params.method !== "GET" && params.method !== "DELETE"
          ? JSON.stringify(params.body)
          : undefined,
      signal: params.signal
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error("Response body is null")
    }

    const reader = response.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        yield { data: value, done: false }
      }
      yield { data: new Uint8Array(0), done: true }
    } finally {
      reader.releaseLock()
    }
  }

  isConnected(): boolean {
    return true // HTTP is always "connected"
  }

  async close(): Promise<void> {
    // HTTP transport doesn't need cleanup
  }

  private buildUrl(params: RequestParams): string {
    const url = new URL(params.path, this.baseUrl)
    if (params.query) {
      for (const [key, value] of Object.entries(params.query)) {
        url.searchParams.set(key, String(value))
      }
    }
    return url.toString()
  }
}
