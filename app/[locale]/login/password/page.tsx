"use client"

import { ChangePassword } from "@/components/utility/change-password"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function ChangePasswordPage() {
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      setLoading(false) // Auth delegated to control plane
      }
    })()
  }, [])

  if (loading) {
    return null
  }

  return <ChangePassword />
}
