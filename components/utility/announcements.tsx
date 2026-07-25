import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { Announcement } from "@/types/announcement"
import { IconExternalLink, IconSpeakerphone } from "@tabler/icons-react"
import { FC, useEffect, useRef, useState } from "react"
import { SIDEBAR_ICON_SIZE } from "../sidebar/sidebar-switcher"

interface AnnouncementsProps {}

// Built-in defaults — source of truth for announcement content.
// New releases add entries here; localStorage only stores read state.
const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "welcome",
    title: "Welcome to AF Deep Research",
    content: "Your AI-powered research assistant is ready.",
    read: false,
    link: "",
    date: "2025-01-01"
  }
]

// Serialize announcements to read-state-only records for localStorage
function serializeReadState(
  list: Announcement[]
): { id: string; read: boolean }[] {
  return list.map(({ id, read }) => ({ id, read }))
}

function loadAnnouncements(): Announcement[] {
  try {
    const stored = localStorage.getItem("announcements")
    if (!stored) return DEFAULT_ANNOUNCEMENTS
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return DEFAULT_ANNOUNCEMENTS
    // Validate each entry is a {id, read} record
    const valid = parsed.filter(
      (a: any) =>
        typeof a === "object" &&
        a !== null &&
        typeof a.id === "string" &&
        typeof a.read === "boolean"
    ) as { id: string; read: boolean }[]
    if (valid.length === 0) return DEFAULT_ANNOUNCEMENTS
    // Merge: start from defaults, apply persisted read state by ID
    const readMap = new Map(valid.map(a => [a.id, a.read]))
    return DEFAULT_ANNOUNCEMENTS.map(d => ({
      ...d,
      read: readMap.get(d.id) ?? d.read
    }))
  } catch {
    return DEFAULT_ANNOUNCEMENTS
  }
}

export const Announcements: FC<AnnouncementsProps> = () => {
  // Start with an empty array for SSR/hydration consistency
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  // Load localStorage into a ref first, then set state from the ref.
  // This satisfies set-state-in-effect: setState from a ref is allowed.
  const loadedRef = useRef<Announcement[]>([])
  useEffect(() => {
    loadedRef.current = loadAnnouncements()
    setAnnouncements(loadedRef.current)
  }, [])

  // Persist to localStorage whenever announcements change (skip initial mount)
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    localStorage.setItem(
      "announcements",
      JSON.stringify(serializeReadState(announcements))
    )
  }, [announcements])

  const unreadCount = announcements.filter(a => !a.read).length

  const markAsRead = (id: string) => {
    const updatedAnnouncements = announcements.map(a =>
      a.id === id ? { ...a, read: true } : a
    )
    setAnnouncements(updatedAnnouncements)
    localStorage.setItem(
      "announcements",
      JSON.stringify(serializeReadState(updatedAnnouncements))
    )
  }

  const markAllAsRead = () => {
    const updatedAnnouncements = announcements.map(a => ({ ...a, read: true }))
    setAnnouncements(updatedAnnouncements)
    localStorage.setItem(
      "announcements",
      JSON.stringify(serializeReadState(updatedAnnouncements))
    )
  }

  const markAllAsUnread = () => {
    const updatedAnnouncements = announcements.map(a => ({ ...a, read: false }))
    setAnnouncements(updatedAnnouncements)
    localStorage.setItem(
      "announcements",
      JSON.stringify(serializeReadState(updatedAnnouncements))
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative cursor-pointer hover:opacity-50">
          <IconSpeakerphone size={SIDEBAR_ICON_SIZE} />
          {unreadCount > 0 && (
            <div className="notification-indicator absolute right-[-4px] top-[-4px] flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {unreadCount}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="mb-2 w-80" side="top">
        <div className="grid gap-4">
          <div>
            <div className="mb-4 text-left text-xl font-bold leading-none">
              Updates
            </div>

            <div className="grid space-y-4">
              {announcements
                .filter(a => !a.read)
                .map((a: Announcement) => (
                  <div key={a.id}>
                    <div className="block select-none rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium leading-none">
                          {a.title}
                        </div>
                        <div className="text-muted-foreground text-xs leading-snug">
                          {a.date}
                        </div>
                      </div>
                      <div className="text-muted-foreground mt-3 text-sm leading-snug">
                        {a.content}
                      </div>

                      <div className="mt-3 space-x-2">
                        <Button
                          className="h-[26px] text-xs"
                          size="sm"
                          onClick={() => markAsRead(a.id)}
                        >
                          Mark as Read
                        </Button>

                        {a.link && (
                          <a href={a.link} target="_blank" rel="noreferrer">
                            <Button className="h-[26px] text-xs" size="sm">
                              Demo{" "}
                              <IconExternalLink className="ml-1" size={14} />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-1">
              {unreadCount > 0 ? (
                <Button
                  className="mt-2"
                  variant="outline"
                  onClick={markAllAsRead}
                >
                  Mark All as Read
                </Button>
              ) : (
                <div className="text-muted-foreground text-sm leading-snug">
                  You are all caught up!
                  {announcements.length > 0 && (
                    <div
                      className="mt-6 cursor-pointer underline"
                      onClick={() => markAllAsUnread()}
                    >
                      Show recent updates
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
