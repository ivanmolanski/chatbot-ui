/**
 * Middleware — Internationalization routing only.
 * No Supabase. No auth. No DB.
 * Auth is handled server-side via the proxy (Phase 11).
 */

import { i18nRouter } from "next-i18n-router"
import { NextRequest, NextResponse } from "next/server"
import i18nConfig from "./i18nConfig"

export async function proxy(request: NextRequest) {
  console.log("[Middleware] Path:", request.nextUrl.pathname)
  
  // Skip i18n routing for ALL API routes - return early before i18nRouter
  // Match exact "/api" path and any "/api/..." sub-paths
  const pathname = request.nextUrl.pathname
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    console.log("[Middleware] Skipping i18n for API route")
    return NextResponse.next()
  }

  const i18nResult = i18nRouter(request, i18nConfig)
  if (i18nResult) return i18nResult

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match ALL paths including API routes so middleware can run and skip them
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"
  ]
}