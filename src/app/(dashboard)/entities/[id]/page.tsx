import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Building2,
  Hotel,
  Fuel,
  Store,
  Landmark,
  ArrowLeft,
  Pencil,
  Trash2,
  FolderKanban,
  CheckSquare,
  FileText,
  Users,
  Calendar,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EntityTabs } from "./tabs"

const entityTypeConfig: Record<string, { icon: typeof Building2; color: string; label: string }> = {
  BUSINESS: { icon: Store, color: "bg-violet-500/10 text-violet-400 border-violet-500/20", label: "Business" },
  HOTEL: { icon: Hotel, color: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Hotel" },
  GAS_STATION: { icon: Fuel, color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Gas Station" },
  COMMERCIAL_PROPERTY: { icon: Building2, color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Commercial Property" },
  INVESTMENT: { icon: Landmark, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Investment" },
  OTHER: { icon: Building2, color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", label: "Other" },
}


export default async function EntityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const orgId = (session.user as any).organizationId

  const entity = await prisma.entity.findFirst({
    where: { id, organizationId: orgId },
    include: {
      _count: { select: { projects: true, tasks: true, contacts: true, documents: true } },
      projects: { orderBy: { updatedAt: "desc" } },
      tasks: {
        include: { assignee: true, project: true },
        orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
      },
      contacts: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!entity) notFound()

  const config = entityTypeConfig[entity.type] || entityTypeConfig.OTHER
  const Icon = config.icon
  let metadata: Record<string, any> = {}
  try { metadata = JSON.parse(entity.metadata) } catch {}

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Back */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/entities" className="hover:text-foreground transition-colors">
          Entities
        </Link>
        <span>/</span>
        <span className="text-foreground">{entity.name}</span>
      </div>

      {/* Entity Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl shrink-0", config.color)}>
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{entity.name}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 border", config.color)}>
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Created {entity.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
            {Object.keys(metadata).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.entries(metadata).map(([key, val]) => (
                  <span
                    key={key}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.03] text-muted-foreground border border-white/[0.06]"
                  >
                    {key}: {String(val)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/entities/${entity.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <form action={async () => {
            "use server"
            // Handled by client
          }}>
            <Button variant="outline" size="sm" className="gap-1.5 text-red-400 hover:text-red-300">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </form>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Projects", value: entity._count.projects, icon: FolderKanban, color: "text-emerald-400" },
          { label: "Tasks", value: entity._count.tasks, icon: CheckSquare, color: "text-violet-400" },
          { label: "Documents", value: entity._count.documents, icon: FileText, color: "text-sky-400" },
          { label: "Contacts", value: entity._count.contacts, icon: Users, color: "text-rose-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl glass p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <div className="text-xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabbed Content */}
      <EntityTabs entity={entity} />
    </div>
  )
}
