/**
 * Proxy Route — Single entry point to AF Deep Research backend.
 *
 * This is temporary. Long-term, the UI connects directly to the gateway via JWT.
 * The proxy exists only for: auth injection, CORS, rate limiting, request signing.
 */

import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.AF_CONTROL_PLANE_URL!
const API_KEY = process.env.AF_API_KEY!

async function proxyRequest(
  request: NextRequest,
  slug: string[],
  method: string
) {
  const path = slug.join("/")
  const url = `${BACKEND_URL}/api/v1/${path}`
  const searchParams = request.nextUrl.searchParams.toString()
  const fullUrl = searchParams ? `${url}?${searchParams}` : url

  const headers = new Headers()
  headers.set("X-API-Key", API_KEY)
  headers.set(
    "Content-Type",
    request.headers.get("Content-Type") || "application/json"
  )
  const accept = request.headers.get("Accept") || ""
  if (accept) headers.set("Accept", accept)

  // Forward protocol version headers
  const apiVersion = request.headers.get("X-API-Version")
  if (apiVersion) headers.set("X-API-Version", apiVersion)
  const eventVersion = request.headers.get("X-Event-Version")
  if (eventVersion) headers.set("X-Event-Version", eventVersion)
  const schemaVersion = request.headers.get("X-Schema-Version")
  if (schemaVersion) headers.set("X-Schema-Version", schemaVersion)

  const response = await fetch(fullUrl, {
    method,
    headers,
    body:
      method !== "GET" && method !== "DELETE" ? await request.text() : undefined
  })

  // Pass through streaming responses directly — use includes() to handle
  // Accept headers like "text/event-stream, text/plain" or "*/*"
  const isSSE = accept.includes("text/event-stream")
  if (isSSE) {
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

  return new Response(response.body, {
    status: response.status,
    headers: Object.fromEntries(response.headers)
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  return proxyRequest(request, params.slug, "GET")
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  return proxyRequest(request, params.slug, "POST")
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  return proxyRequest(request, params.slug, "PUT")
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  return proxyRequest(request, params.slug, "DELETE")
}

export const runtime = "nodejs"
