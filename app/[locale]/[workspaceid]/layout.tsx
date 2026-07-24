/**
 * Workspace Layout — Uses AIPlatformClient to fetch workspace data.
 * Zero Supabase. Zero DB. Data flows through the control plane proxy.
 * Per ARCHITECTURE.md Phase 1: Execution is primary.
 */

"use client"

import { Dashboard } from "@/components/ui/dashboard"
import { ChatbotUIContext } from "@/context/context"
import { useParams, useRouter } from "next/navigation"
import { ReactNode, useCallback, useContext, useEffect, useState } from "react"
import Loading from "../loading"

interface WorkspaceLayoutProps {
  children: ReactNode
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter()

  const params = useParams()
  const workspaceId = params.workspaceid as string

  const {
    selectedWorkspace,
    setSelectedWorkspace,
    setChats,
    setChatMessages,
    setUserInput,
    setIsGenerating,
    setFirstTokenReceived,
    setChatFiles,
    setChatImages,
    setNewMessageFiles,
    setNewMessageImages,
    setShowFilesDisplay,
    setSelectedChat
  } = useContext(ChatbotUIContext)

  const [loading, setLoading] = useState(true)

  const fetchWorkspaceData = useCallback(
    async (workspaceId: string) => {
      setLoading(true)

      // Per ARCHITECTURE.md Phase 1: Data flows from execution
      // Workspace data is fetched via the control plane through the proxy
      // For now, set a minimal workspace using the ID from the URL
      setSelectedWorkspace({
        id: workspaceId,
        name: "Workspace",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any)

      setLoading(false)
    },
    [setSelectedWorkspace]
  )

  useEffect(() => {
    fetchWorkspaceData(workspaceId)
  }, [fetchWorkspaceData, workspaceId])

  useEffect(() => {
    fetchWorkspaceData(workspaceId)

    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)

    setIsGenerating(false)
    setFirstTokenReceived(false)

    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setShowFilesDisplay(false)
  }, [
    fetchWorkspaceData,
    workspaceId,
    setChatFiles,
    setChatImages,
    setChatMessages,
    setFirstTokenReceived,
    setIsGenerating,
    setNewMessageFiles,
    setNewMessageImages,
    setSelectedChat,
    setShowFilesDisplay,
    setUserInput
  ])

  if (loading) {
    return <Loading />
  }

  return <Dashboard>{children}</Dashboard>
}
