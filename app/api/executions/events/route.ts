/**
 * SSE Proxy for Execution Events — Direct pass-through to control plane SSE.
 *
 * The control plane exposes SSE at /api/ui/v1/workflows/{id}/notes/events
 * This route forwards the connection with auth injection.
 * If control plane SSE fails, returns error — chat handler has polling fallback.
 */

import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Validate required env vars at handler start
  const BACKEND_URL = process.env.AF_CONTROL_PLANE_URL
  const API_KEY = process.env.AF_API_KEY
  if (!BACKEND_URL || !API_KEY) {
    console.error("[SSE Proxy] Missing AF_CONTROL_PLANE_URL or AF_API_KEY")
    return new NextResponse("Server configuration error", { status: 500 })
  }

  const rawExecutionId = request.nextUrl.searchParams.get("execution_id")
  if (!rawExecutionId) {
    return new NextResponse("Missing execution_id parameter", { status: 400 })
  }

  // Validate executionId format — reject path traversal or non-identifier chars
  if (!/^[a-zA-Z0-9_-]+$/.test(rawExecutionId)) {
    return new NextResponse("Invalid execution_id format", { status: 400 })
  }

  // Strip trailing slash from BACKEND_URL to avoid double-slash
  const base = BACKEND_URL.replace(/\/+$/, "")
  const fullUrl = `${base}/api/ui/v1/workflows/${encodeURIComponent(rawExecutionId)}/notes/events`

  const headers = new Headers()
  headers.set("Authorization", `Bearer ${API_KEY}`)
  headers.set("Accept", "text/event-stream")

  try {
    const response = await fetch(fullUrl, {
      method: "GET",
      headers,
      signal: request.signal
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      console.error(
        `[SSE Proxy] Control plane error ${response.status}: ${errorText}`
      )
      // Map 401/403 to 502 so callers don't retry auth against the proxy
      const clientStatus =
        response.status === 401 || response.status === 403
          ? 502
          : response.status
      return new NextResponse("Upstream error", { status: clientStatus })
    }

    // Pass the control plane SSE stream directly through to the client
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      }
    })
  } catch (e) {
    const errMsg = (e as Error).message || "Unknown error"
    console.error(`[SSE Proxy] Failed to connect to control plane: ${errMsg}`)
    return new NextResponse("SSE connection failed", { status: 502 })
  }
}

export const runtime = "nodejs"
