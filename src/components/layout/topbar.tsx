"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Command, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

const typeIcons: Record<string, string> = {
  DEADLINE: "⏰",
  OVERDUE: "🔴",
  STALLED: "⚠️",
  RENEWAL: "📄",
  MENTION: "💬",
}

interface TopbarProps {
  user?: { name?: string | null; email?: string | null }
}

export function Topbar({ user }: TopbarProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [showShortcut, setShowShortcut] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Organization name
  const [orgName, setOrgName] = useState("Operion")

  useEffect(() => {
    fetch("/api/organization")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.name) setOrgName(data.name) })
      .catch(() => {})
  }, [])

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?unread=false")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
        setUnreadCount(data.length)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Poll every 30s
    const interval = setInterval(fetchNotifications, 30000)
    // Refresh on window focus
    const onFocus = () => fetchNotifications()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [fetchNotifications])

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch { /* ignore */ }
  }

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch { /* ignore */ }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && searchQuery.trim()) {
      e.preventDefault()
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  // Global Cmd+K / Ctrl+K shortcut to focus search
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown)
    return () => document.removeEventListener("keydown", handleGlobalKeyDown)
  }, [])

  const formatNotifTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return "now"
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    return `${diffDays}d ago`
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-white/[0.06] bg-[#08080a]/60 px-4 backdrop-blur-xl">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowShortcut(true)}
          onBlur={() => setShowShortcut(false)}
          placeholder="Search across all entities..."
          className="pl-9 pr-16 h-9 border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.06] transition-colors"
        />
        <div
          className={cn(
            "absolute right-2 top-1.5 flex items-center gap-0.5 rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/40 border border-white/[0.05] transition-opacity pointer-events-none",
            showShortcut || !searchQuery ? "opacity-100" : "opacity-0"
          )}
        >
          <Command className="h-2.5 w-2.5" />
          <span>K</span>
        </div>
      </form>

      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 relative"
            aria-label="Open notifications"
            onClick={() => setNotifOpen(!notifOpen)}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-background">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-80 rounded-lg border border-white/[0.08] glass-deep shadow-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <span className="text-sm font-medium">Notifications</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={markAllRead}>
                        Mark all read
                      </Button>
                    )}
                  </div>
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No notifications</p>
                      <p className="text-xs text-muted-foreground/50 mt-1">You're all caught up</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 hover:bg-white/[0.06] transition-colors cursor-pointer border-b border-white/[0.02]",
                          !notif.read && "bg-white/[0.02]"
                        )}
                        onClick={() => {
                          markAsRead(notif.id)
                          if (notif.link) {
                            // Close the popover before navigating. A hard navigation is
                            // intentional here: router.push can be coalesced when the
                            // current page is already the same collection route.
                            setNotifOpen(false)
                            window.location.assign(notif.link)
                          }
                        }}
                      >
                        <span className="text-lg shrink-0 mt-0.5">{typeIcons[notif.type] || "📌"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{notif.title}</span>
                            {!notif.read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground/50 shrink-0 mt-0.5">
                          {formatNotifTime(notif.createdAt)}
                        </span>
                      </div>
                    ))
                  )}
                  {notifications.length > 0 && (
                    <button
                      className="w-full px-4 py-2.5 text-xs text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-colors text-center border-t border-white/[0.06]"
                      onClick={() => {
                        setNotifOpen(false)
                        router.push("/notifications")
                      }}
                    >
                      View all notifications
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" aria-label="Open account menu" className="h-8 w-8 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-sidebar-accent">
                  {user?.name?.split(" ").map((n: string) => n[0]).join("") || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings/profile")}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
