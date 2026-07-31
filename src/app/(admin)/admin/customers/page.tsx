import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Users,
  Search,
  ArrowUpDown,
} from "lucide-react"
import Link from "next/link"

// ── Status Badge ──────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    TRIAL: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
    EXPIRED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        colors[status] || colors.EXPIRED
      )}
    >
      {status}
    </span>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { sort?: string; search?: string }
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session.user as any).role !== "OWNER") redirect("/home")

  const sort = searchParams.sort || "createdAt_desc"
  const search = searchParams.search || ""
  const [sortField, sortDir] = sort.split("_")

  // Fetch all orgs with their owner user
  const orgsRaw = await prisma.organization.findMany({
    include: {
      users: {
        where: { role: "OWNER" },
        select: { email: true, name: true },
        take: 1,
      },
      _count: {
        select: { entities: true },
      },
    },
  })

  // Get last activity for each org
  const orgsWithActivity = await Promise.all(
    orgsRaw.map(async (org) => {
      const lastActivity = await prisma.auditLog.findFirst({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      })
      const lastActivityDate = lastActivity?.createdAt || org.createdAt
      return {
        id: org.id,
        name: org.name,
        ownerEmail: org.users[0]?.email || "N/A",
        ownerName: org.users[0]?.name || "N/A",
        plan: org.subscriptionTier,
        status: org.subscriptionStatus,
        signupDate: org.createdAt,
        trialEndDate: org.trialEndDate,
        entityCount: org._count.entities,
        lastActivityDate,
      }
    })
  )

  // Filter by search
  let filtered = orgsWithActivity
  if (search) {
    const lower = search.toLowerCase()
    filtered = orgsWithActivity.filter(
      (o) =>
        o.name.toLowerCase().includes(lower) ||
        o.ownerEmail.toLowerCase().includes(lower) ||
        o.ownerName.toLowerCase().includes(lower)
    )
  }

  // Sort
  filtered.sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case "name":
        cmp = a.name.localeCompare(b.name)
        break
      case "plan":
        cmp = a.plan.localeCompare(b.plan)
        break
      case "status":
        cmp = a.status.localeCompare(b.status)
        break
      case "signupDate":
        cmp = a.signupDate.getTime() - b.signupDate.getTime()
        break
      case "trialEndDate":
        cmp = (a.trialEndDate?.getTime() || 0) - (b.trialEndDate?.getTime() || 0)
        break
      case "entityCount":
        cmp = a.entityCount - b.entityCount
        break
      case "lastActivity":
        cmp = a.lastActivityDate.getTime() - b.lastActivityDate.getTime()
        break
      case "createdAt":
      default:
        cmp = a.signupDate.getTime() - b.signupDate.getTime()
        break
    }
    return sortDir === "asc" ? cmp : -cmp
  })

  // Sort link helper
  const sortLink = (field: string) => {
    const currentField = sortField
    const currentDir = sortDir
    const newDir = currentField === field && currentDir === "asc" ? "desc" : "asc"
    const params = new URLSearchParams()
    params.set("sort", `${field}_${newDir}`)
    if (search) params.set("search", search)
    return `/admin/customers?${params.toString()}`
  }

  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <Link
      href={sortLink(field)}
      className="inline-flex items-center gap-1 hover:text-white transition-colors"
    >
      {label}
      {sortField === field && (
        <ArrowUpDown className="h-3 w-3 text-zinc-500" />
      )}
    </Link>
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {filtered.length} organization{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search */}
        <form className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by name or email..."
            className="h-9 w-64 rounded-lg bg-[#111111] border border-white/[0.06] pl-9 pr-4 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.15]"
          />
        </form>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-[#111111] border border-white/[0.04] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04] bg-[#0a0a0a]/50">
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">
                  <SortHeader field="name" label="Organization" />
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">
                  <SortHeader field="createdAt" label="Owner" />
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">
                  <SortHeader field="plan" label="Plan" />
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">
                  <SortHeader field="status" label="Status" />
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">
                  <SortHeader field="signupDate" label="Signup" />
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">
                  <SortHeader field="trialEndDate" label="Trial Ends" />
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">
                  <SortHeader field="entityCount" label="Entities" />
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">
                  <SortHeader field="lastActivity" label="Last Active" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((org) => (
                <tr
                  key={org.id}
                  className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-4 font-medium">{org.name}</td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="text-zinc-300">{org.ownerName !== "N/A" ? org.ownerName : org.ownerEmail}</div>
                      {org.ownerName !== "N/A" && (
                        <div className="text-xs text-zinc-600">{org.ownerEmail}</div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "text-xs font-medium",
                      org.plan === "TEAM" ? "text-blue-400" : "text-zinc-400"
                    )}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={org.status} />
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-500 text-xs tabular-nums">
                    {org.signupDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-500 text-xs tabular-nums">
                    {org.trialEndDate
                      ? org.trialEndDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium">
                    {org.entityCount}
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-500 text-xs tabular-nums">
                    {org.lastActivityDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    {search ? "No organizations match your search." : "No organizations yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
