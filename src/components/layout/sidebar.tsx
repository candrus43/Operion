"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  CheckSquare,
  FileText,
  Users,
  Calendar,
  Sparkles,
  ChevronLeft,
  Briefcase,
  Upload,
  Settings,
  CreditCard,
  ClipboardList,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const mainNavItems = [
  { href: "/home", label: "Dashboard", icon: LayoutDashboard },
  { href: "/entities", label: "Entities", icon: Building2 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/import", label: "Import Data", icon: Upload },
  { href: "/ea", label: "EA Workspace", icon: Briefcase },
  { href: "/ai", label: "AI Assistant", icon: Sparkles },
]

const bottomNavItems = [
  { href: "/pricing", label: "Pricing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
]

const adminNavItems = [
  { href: "/audit-log", label: "Audit Log", icon: ClipboardList },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [tier, setTier] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => setUserRole(data?.user?.role || null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/settings/logo")
      .then((res) => res.json())
      .then((data) => setLogoUrl(data.logoUrl))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/organization")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.tier) setTier(data.tier) })
      .catch(() => {})
  }, [])

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-8 max-w-[120px] object-contain object-left"
              />
            ) : (
              <>
                <img src="/logo.svg" alt="Operion" className="h-7 w-7 shrink-0" />
                <span className="text-lg font-bold tracking-tight">Operion</span>
              </>
            )}
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="mx-auto">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-6 w-6 object-contain"
              />
            ) : (
              <img src="/logo.svg" alt="Operion" className="h-6 w-6" />
            )}
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn("h-7 w-7 shrink-0", collapsed && "hidden")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-7 w-7 shrink-0 rotate-180 mx-auto mt-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Separator />

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {mainNavItems
          .filter((item) => {
            // Hide EA Workspace for SOLO tier
            if (item.href === "/ea" && tier === "SOLO") return false
            return true
          })
          .map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-sidebar-accent group",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-accent-foreground")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Bottom Navigation */}
      <div className="p-2 space-y-1">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-sidebar-accent group",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/40 hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-accent-foreground")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}

        {/* Admin-only links */}
        {userRole && (userRole === "OWNER" || userRole === "EXECUTIVE_ASSISTANT") &&
          adminNavItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-sidebar-accent group",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/40 hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-accent-foreground")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })
        }
      </div>
    </aside>
  )
}
