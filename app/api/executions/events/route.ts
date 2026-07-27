/**
 * SSE Proxy for Execution Events — Proxies to control plane SSE endpoint.
 *
 * The control plane exposes SSE at /api/ui/v1/executions/events
 * This route forwards the connection with auth injection.
 */

import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.AF_CONTROL_PLANE_URL!
const API_KEY = process.env.AF_API_KEY!

export async function GET(request: NextRequest) {
  const url = `${BACKEND_URL}/api/ui/v1/executions/events`
  const searchParams = request.nextUrl.searchParams.toString()
  const fullUrl = searchParams ? `${url}?${searchParams}` : url

  const headers = new Headers()
  headers.set("X-API-Key", API_KEY)
  headers.set("Accept", "text/event-stream")

  const response = await fetch(fullUrl, {
    method: "GET",
    headers
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    return new NextResponse(errorText, { status: response.status })
  }

  // Pass through the SSE stream
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...Object.fromEntries(response.headers)
    }
  })
}

export const runtime = "nodejs"
