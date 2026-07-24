/**
 * Setup Page — Redirects to workspace.
 * Setup is handled by the AF control plane.
 */

"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function SetupPage() {
  const router = useRouter()

  useEffect(() => {
    // Skip setup — go directly to workspace
    router.replace("/default/chat")
  }, [router])

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-lg">Setting up workspace...</div>
    </div>
  )
}
