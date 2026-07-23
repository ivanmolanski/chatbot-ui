/**
 * Middleware — Internationalization routing only.
 * No Supabase. No auth. No DB.
 * Auth is handled server-side via the proxy (Phase 11).
 */

import { i18nRouter } from "next-i18n-router"
import { NextRequest } from "next/server"
import i18nConfig from "./i18nConfig"

export async function middleware(request: NextRequest) {
  const i18nResult = i18nRouter(request, i18nConfig)
  if (i18nResult) return i18nResult

  return i18nResult
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next|auth).*)"
}