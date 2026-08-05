"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

const sectionLabels: Record<string, string> = {
  ai: "AI Briefing",
  audit-log: "Audit Log",
  calendar: "Calendar",
  contacts: "Contacts",
  documents: "Documents",
  ea: "EA Workspace",
  entities: "Entities",
  home: "Home",
  import: "Import",
  meetings: "Meetings",
  notifications: "Notifications",
  projects: "Projects",
  search: "Search",
  settings: "Settings",
  tasks: "Tasks",
}

const childLabels: Record<string, string> = {
  edit: "Edit",
  new: "New",
  profile: "Profile",
  support: "Support",
  team: "Team",
  billing: "Billing",
  cancelled: "Cancelled",
}

function formatSegment(segment: string, parent?: string) {
  if (childLabels[segment]) return childLabels[segment]
  if (sectionLabels[segment]) return sectionLabels[segment]
  // IDs are intentionally shown as a stable, human-friendly page label. The
  // detail page itself provides the entity name in its heading.
  if (parent && ["entities", "projects", "tasks", "documents", "contacts", "meetings"].includes(parent)) {
    return "Details"
  }
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const crumbs = segments.length
    ? segments.map((segment, index) => ({
        label: formatSegment(segment, segments[index - 1]),
        href: `/${segments.slice(0, index + 1).join("/")}`,
      }))
    : []

  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-zinc-500">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-white/[0.05] hover:text-zinc-300"
      >
        <Home className="h-3 w-3" aria-hidden="true" />
        <span>Dashboard</span>
      </Link>
      {crumbs.map((crumb, index) => {
        const isCurrent = index === crumbs.length - 1
        return (
          <span key={crumb.href} className="inline-flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-zinc-700" aria-hidden="true" />
            {isCurrent ? (
              <span aria-current="page" className="px-1.5 py-1 text-zinc-400">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="rounded-md px-1.5 py-1 transition-colors hover:bg-white/[0.05] hover:text-zinc-300"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
