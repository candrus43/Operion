"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
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
  HelpCircle,
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
  { href: "/help", label: "Help", icon: HelpCircle },
  { href: "/settings", label: "Settings", icon: Settings },
]

const adminNavItems = [
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/audit-log", label: "Audit Log", icon: ClipboardList },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role ?? null
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [tier, setTier] = useState<string | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)

  // Single fetch to /api/organization provides logo, tier, and subscription status
  useEffect(() => {
    fetch("/api/organization")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.logoUrl) setLogoUrl(data.logoUrl)
        if (data?.tier) setTier(data.tier)
        if (data?.subscriptionStatus) setSubscriptionStatus(data.subscriptionStatus)
      })
      .catch(() => {})
  }, [])

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-white/[0.06] bg-[#08080a]/70 backdrop-blur-2xl transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-white/[0.06]">
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
                <img src="/logo.svg" alt="" className="h-7 w-7 shrink-0" />
                <span className="text-lg font-semibold tracking-tight">Operion</span>
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
              <img src="/logo.svg" alt="" className="h-6 w-6" />
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

      <Separator className="bg-white/[0.06]" />

      {/* Main Navigation */}
      <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
        {mainNavItems
          .filter((item) => {
            // Fix 3: Gate EA Workspace link by role, not tier
            if (item.href === "/ea" && userRole !== "EXECUTIVE_ASSISTANT" && userRole !== "OWNER") return false
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
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_20px_rgba(139,92,246,0.08)]"
                  : "text-white/50 hover:bg-white/[0.04] hover:text-white/90"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-violet-300" : "text-white/40 group-hover:text-white/70")} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && isActive && (
                <span className="ml-auto h-1 w-1 rounded-full bg-violet-400" />
              )}
            </Link>
          )
        })}
      </nav>

      <Separator className="bg-white/[0.06]" />

      {/* Bottom Navigation */}
      <div className="p-2 space-y-0.5">
        {bottomNavItems
          .filter((item) => {
            // Hide Pricing for ACTIVE subscribers
            if (item.href === "/pricing" && subscriptionStatus === "ACTIVE") return false
            return true
          })
          .map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-white/40 hover:bg-white/[0.04] hover:text-white/80"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-violet-300" : "text-white/35 group-hover:text-white/60")} />
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
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    : "text-white/40 hover:bg-white/[0.04] hover:text-white/80"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-violet-300" : "text-white/35 group-hover:text-white/60")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })
        }
      </div>
    </aside>
  )
}
