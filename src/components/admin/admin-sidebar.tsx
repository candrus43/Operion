"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  PenLine,
  ArrowLeft,
  LogOut,
} from "lucide-react"

const adminNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/content", label: "Content", icon: PenLine },
]

export function AdminSidebar({ adminEmail }: { adminEmail?: string }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin"
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-56 flex-shrink-0 border-r border-white/[0.06] bg-[#0a0a0a] flex flex-col h-screen">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Operion" className="h-6 w-6" />
          <span className="font-semibold text-sm">Admin</span>
        </Link>
        {adminEmail && (
          <p className="text-[10px] text-zinc-600 mt-1 truncate">{adminEmail}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {adminNavItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-white/[0.04]",
                active
                  ? "bg-white/[0.06] text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-white")} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Back to app + Logout */}
      <div className="p-3 border-t border-white/[0.06] space-y-1">
        <Link
          href="/home"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-all"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span>Back to app</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all w-full text-left"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  )
}
