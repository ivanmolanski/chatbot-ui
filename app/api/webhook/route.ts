/**
 * Webhook Endpoint — Receives observability events from AgentField control plane.
 *
 * The control plane forwards execution events (execution_updated, workflow_note_added,
 * execution_completed, execution_failed, etc.) to this endpoint.
 *
 * Per ARCHITECTURE.md Phase 4: CloudEvents streaming protocol.
 */

import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log the incoming webhook for debugging
    console.log("[Webhook] Received event:", JSON.stringify(body, null, 2))

    // The control plane sends CloudEvents format
    // We need to forward these to connected SSE clients
    // For now, we'll just acknowledge receipt

    return NextResponse.json({ success: true, received: true })
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error)
    return NextResponse.json(
      { success: false, error: "Invalid payload" },
      { status: 400 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint for webhook verification
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhook",
    description: "AgentField observability webhook endpoint"
  })
}
