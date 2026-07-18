import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FolderKanban,
  Plus,
  Search,
  Calendar,
  Building2,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

const phaseLabels: Record<string, string> = {
  ACQUISITION: "Acquisition",
  DUE_DILIGENCE: "Due Diligence",
  DESIGN: "Design",
  PERMITTING: "Permitting",
  CONSTRUCTION: "Construction",
  CLOSEOUT: "Closeout",
  OPERATIONS: "Operations",
}

const phaseColors: Record<string, string> = {
  ACQUISITION: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  DUE_DILIGENCE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  DESIGN: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  PERMITTING: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  CONSTRUCTION: "bg-red-500/10 text-red-400 border-red-500/20",
  CLOSEOUT: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  OPERATIONS: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-400",
  ON_HOLD: "bg-amber-500/10 text-amber-400",
  COMPLETED: "bg-blue-500/10 text-blue-400",
  CANCELLED: "bg-red-500/10 text-red-400",
}

export default async function ProjectsPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const orgId = (session.user as any).organizationId
  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No organization found.</p>
      </div>
    )
  }

  const searchParams = await props.searchParams
  const statusFilter = searchParams.status || ""
  const phaseFilter = searchParams.phase || ""

  const where: any = { organizationId: orgId }
  if (statusFilter && statusFilter !== "all") where.status = statusFilter
  if (phaseFilter && phaseFilter !== "all") where.phase = phaseFilter

  const projects = await prisma.project.findMany({
    where,
    include: {
      entity: { select: { id: true, name: true, type: true } },
      _count: { select: { tasks: true, documents: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const projectCount = await prisma.project.count({
    where: { organizationId: orgId },
  })

  // Get unique statuses and phases for filters
  const allProjectsForFilters = await prisma.project.findMany({
    where: { organizationId: orgId },
    select: { status: true, phase: true },
    distinct: ["status", "phase"],
  })

  const uniqueStatuses = [...new Set(allProjectsForFilters.map((p) => p.status))]
  const uniquePhases = [...new Set(allProjectsForFilters.map((p) => p.phase))]

  // Progress bar color helper
  const progressColor = (pct: number) => {
    if (pct >= 75) return "bg-emerald-500"
    if (pct >= 50) return "bg-blue-500"
    if (pct >= 25) return "bg-amber-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            {projectCount} {projectCount === 1 ? "project" : "projects"} across your organization
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Suspense>
          <FilterBar
            currentStatus={statusFilter}
            currentPhase={phaseFilter}
            statuses={uniqueStatuses}
            phases={uniquePhases}
          />
        </Suspense>
      </div>

      {/* Project Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="border-0 bg-[#111111] hover:bg-[#141414] transition-all hover:scale-[1.01] cursor-pointer group h-full">
              <CardContent className="p-5 space-y-4">
                {/* Top row: name + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate group-hover:text-white transition-colors">
                      {project.name}
                    </h3>
                    {project.entity && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Building2 className="h-3 w-3 text-muted-foreground/40" />
                        <span className="text-[11px] text-muted-foreground truncate">
                          {project.entity.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 shrink-0",
                      statusColors[project.status] || "bg-zinc-500/10 text-zinc-400"
                    )}
                  >
                    {project.status.replace("_", " ")}
                  </Badge>
                </div>

                {/* Phase badge */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 border",
                      phaseColors[project.phase] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    )}
                  >
                    {phaseLabels[project.phase] || project.phase}
                  </Badge>
                  {project.budget && (
                    <span className="text-[11px] text-muted-foreground/50">
                      ${project.budget.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-muted-foreground font-medium tabular-nums">
                      {project.progress}%
                    </span>
                  </div>
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                    <div
                      className={cn("h-full rounded-full transition-all", progressColor(project.progress))}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Bottom row: task count + date */}
                <div className="flex items-center justify-between pt-1 border-t border-white/[0.03]">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground/50">
                    <span>{project._count.tasks} tasks</span>
                    {project._count.documents > 0 && (
                      <span>{project._count.documents} docs</span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground/30">
                    {project.targetDate && (
                      <>
                        <Calendar className="h-2.5 w-2.5" />
                        <span>
                          {new Date(project.targetDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </>
                    )}
                    <ChevronRight className="h-3 w-3 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a1a1a] mb-4">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No projects yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Create your first project to start tracking progress, budgets, and timelines.
          </p>
          <Link href="/projects/new" className="mt-4">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Project
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

// Client filter component
function FilterBar({
  currentStatus,
  currentPhase,
  statuses,
  phases,
}: {
  currentStatus: string
  currentPhase: string
  statuses: string[]
  phases: string[]
}) {
  return (
    <form className="flex flex-wrap items-center gap-3 w-full" method="GET">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="search"
          placeholder="Search projects..."
          className="pl-9 bg-[#111111] border-0"
        />
      </div>
      <Select
        name="status"
        defaultValue={currentStatus || "all"}
      >
        <SelectTrigger className="w-[140px] bg-[#111111] border-0 text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
          <SelectItem value="all">All Statuses</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        name="phase"
        defaultValue={currentPhase || "all"}
      >
        <SelectTrigger className="w-[150px] bg-[#111111] border-0 text-sm">
          <SelectValue placeholder="Phase" />
        </SelectTrigger>
        <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
          <SelectItem value="all">All Phases</SelectItem>
          {phases.map((p) => (
            <SelectItem key={p} value={p}>
              {phaseLabels[p] || p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" variant="outline" size="sm" className="gap-1.5">
        <Search className="h-3.5 w-3.5" />
        Filter
      </Button>
    </form>
  )
}
