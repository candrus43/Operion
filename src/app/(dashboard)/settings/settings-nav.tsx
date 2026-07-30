"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Settings, User, Users, Shield } from "lucide-react"

const settingsNavItems = [
  { href: "/settings", label: "General", icon: Settings },
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings/support", label: "Support", icon: Shield },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 border-b border-[#262626] pb-0 -mx-2 px-2">
      {settingsNavItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-[1px] transition-colors",
              isActive
                ? "border-white text-white"
                : "border-transparent text-muted-foreground hover:text-white hover:border-[#444]"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
