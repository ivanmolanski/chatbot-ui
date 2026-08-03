/**
 * Proxy Route — Single entry point to AF Deep Research backend.
 *
 * This is temporary. Long-term, the UI connects directly to the gateway via JWT.
 * The proxy exists only for: auth injection, CORS, rate limiting, request signing.
 */

import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL =
  process.env.AF_CONTROL_PLANE_URL || process.env.CONTROL_PLANE_URL!
const API_KEY = process.env.AGENTFIELD_API_KEY || process.env.AF_API_KEY!

function getRequestDiagnostics() {
  const configuredModel =
    process.env.AF_DEFAULT_MODEL ||
    process.env.DEFAULT_MODEL ||
    process.env.OPENROUTER_DEFAULT_MODEL ||
    ""
  const provider =
    process.env.AF_PROVIDER || process.env.LITELLM_PROVIDER || "openrouter"
  const apiBase =
    process.env.OPENROUTER_API_BASE || process.env.LITELLM_API_BASE || ""

  return {
    provider,
    model: configuredModel,
    apiBase,
    hasOpenRouterApiKey: Boolean(process.env.OPENROUTER_API_KEY),
    hasBackendUrl: Boolean(BACKEND_URL),
    hasProxyApiKey: Boolean(API_KEY)
  }
}

async function proxyRequest(
  request: NextRequest,
  slug: string[],
  method: string
) {
  if (!BACKEND_URL || !API_KEY) {
    const diagnostics = getRequestDiagnostics()
    console.error("[AF Proxy] Missing required control-plane configuration", {
      ...diagnostics,
      path: slug.join("/"),
      envSource: {
        backendUrl: process.env.AF_CONTROL_PLANE_URL
          ? "AF_CONTROL_PLANE_URL"
          : "CONTROL_PLANE_URL",
        apiKey: process.env.AGENTFIELD_API_KEY
          ? "AGENTFIELD_API_KEY"
          : "AF_API_KEY"
      }
    })

    return NextResponse.json(
      {
        error:
          "Missing required control-plane configuration: AF_CONTROL_PLANE_URL/CONTROL_PLANE_URL and AGENTFIELD_API_KEY/AF_API_KEY are required.",
        diagnostics
      },
      { status: 500 }
    )
  }

  const path = slug.join("/")
  const url = `${BACKEND_URL}/api/v1/${path}`
  const searchParams = request.nextUrl.searchParams.toString()
  const fullUrl = searchParams ? `${url}?${searchParams}` : url

  const headers = new Headers()
  headers.set("Authorization", `Bearer ${API_KEY}`)
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

  if (!response.ok) {
    console.error("[AF Proxy] Upstream request failed", {
      path,
      method,
      status: response.status,
      ...getRequestDiagnostics()
    })
  }

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
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return proxyRequest(request, slug, "GET")
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return proxyRequest(request, slug, "POST")
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return proxyRequest(request, slug, "PUT")
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return proxyRequest(request, slug, "DELETE")
}

export const runtime = "nodejs"
