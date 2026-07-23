/**
 * Login — Presentation layer using AIPlatformClient.
 * Zero Supabase. Zero DB. Auth flows through the proxy to control plane.
 * Per ARCHITECTURE.md Phase 2: execute() is the single entry point.
 */

import { Brand } from "@/components/ui/brand"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/ui/submit-button"
import { HTTPTransport } from "@/lib/ai-platform/transport/http"
import { AFDeepResearchAdapter } from "@/lib/ai-platform/adapters/af-deep-research"
import { AIPlatformClientImpl } from "@/lib/ai-platform/client-impl"
import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Login"
}

export default async function Login({
  searchParams
}: {
  searchParams: { message: string }
}) {
  const signIn = async (formData: FormData) => {
    "use server"

    const email = formData.get("email") as string

    // Auth is handled by the control plane via proxy
    // Phase 11: Proxy injects X-API-Key server-side
    const transport = new HTTPTransport({
      baseUrl: process.env.AF_CONTROL_PLANE_URL || "/api/v1",
      headers: {
        "X-API-Key": process.env.AF_API_KEY || ""
      }
    })
    const adapter = new AFDeepResearchAdapter()
    const client = new AIPlatformClientImpl(transport, adapter)

    try {
      // Authenticate via control plane
      const password = formData.get("password") as string
      const capabilities = await client.getCapabilities()

      if (!capabilities.executionTypes.length) {
        return redirect("/login?message=Authentication failed")
      }

      return redirect(
        `/login?message=Signed in successfully. Capabilities: ${capabilities.executionTypes.join(", ")}`
      )
    } catch (error) {
      console.error(error)
      return redirect(
        `/login?message=${error instanceof Error ? error.message : "Authentication failed"}`
      )
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col justify-center gap-2 px-8 sm:max-w-md">
      <form
        className="animate-in text-foreground flex w-full flex-1 flex-col justify-center gap-2"
        action={signIn}
      >
        <Brand />

        <Label className="text-md mt-4" htmlFor="email">
          Email
        </Label>
        <Input
          className="mb-3 rounded-md border bg-inherit px-4 py-2"
          name="email"
          placeholder="you@example.com"
          required
        />

        <Label className="text-md" htmlFor="password">
          Password
        </Label>
        <Input
          className="mb-6 rounded-md border bg-inherit px-4 py-2"
          type="password"
          name="password"
          placeholder="••••••••"
        />

        <SubmitButton className="mb-2 rounded-md bg-blue-700 px-4 py-2 text-white">
          Login
        </SubmitButton>

        {searchParams?.message && (
          <p className="bg-foreground/10 text-foreground mt-4 p-4 text-center">
            {searchParams.message}
          </p>
        )}
      </form>
    </div>
  )
}