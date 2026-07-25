"use client"

import { ChangePassword } from "@/components/utility/change-password"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function ChangePasswordPage() {
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  if (loading) {
    return null
  }

  return <ChangePassword />
}
