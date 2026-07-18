import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Pencil,
  Trash2,
  FolderKanban,
  CheckSquare,
  FileText,
  Calendar,
  Building2,
  DollarSign,
  Clock,
  Target,
  Sparkles,
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

const allPhases = [
  "ACQUISITION",
  "DUE_DILIGENCE",
  "DESIGN",
  "PERMITTING",
  "CONSTRUCTION",
  "CLOSEOUT",
  "OPERATIONS",
]

const priorityColor = (p: string) => {
  switch (p) {
    case "CRITICAL":
      return "bg-red-500/10 text-red-400 border-red-500/20"
    case "HIGH":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20"
    case "MEDIUM":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
  }
}

const statusColor = (s: string) => {
  switch (s) {
    case "WAITING_ON":
      return "text-amber-400 bg-amber-500/10"
    case "BLOCKED":
      return "text-red-400 bg-red-500/10"
    case "IN_PROGRESS":
      return "text-blue-400 bg-blue-500/10"
    case "DONE":
      return "text-emerald-400 bg-emerald-500/10"
    case "TODO":
      return "text-zinc-400 bg-zinc-500/10"
    default:
      return "text-zinc-400 bg-zinc-500/10"
  }
}

const docTypeConfig: Record<string, { color: string }> = {
  CONTRACT: { color: "text-amber-400 bg-amber-500/10" },
  PURCHASE_AGREEMENT: { color: "text-violet-400 bg-violet-500/10" },
  LEASE: { color: "text-sky-400 bg-sky-500/10" },
  INSURANCE: { color: "text-emerald-400 bg-emerald-500/10" },
  LICENSE: { color: "text-blue-400 bg-blue-500/10" },
  TAX: { color: "text-red-400 bg-red-500/10" },
  FINANCIAL_STATEMENT: { color: "text-amber-400 bg-amber-500/10" },
  PHOTO: { color: "text-rose-400 bg-rose-500/10" },
  PDF: { color: "text-zinc-400 bg-zinc-500/10" },
  OTHER: { color: "text-zinc-400 bg-zinc-500/10" },
}

const progressColor = (pct: number) => {
  if (pct >= 75) return "bg-emerald-500"
  if (pct >= 50) return "bg-blue-500"
  if (pct >= 25) return "bg-amber-500"
  return "bg-red-500"
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const orgId = (session.user as any).organizationId

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    include: {
      entity: true,
      tasks: {
        include: {
          assignee: true,
          dependsOn: { select: { id: true, title: true, status: true } },
        },
        orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
      },
      documents: { orderBy: { createdAt: "desc" } },
      meetings: { orderBy: { date: "desc" } },
      _count: { select: { tasks: true, documents: true, meetings: true } },
    },
  })

  if (!project) notFound()

  const openTasks = project.tasks.filter((t) => t.status !== "DONE").length
  const doneTasks = project.tasks.filter((t) => t.status === "DONE").length

  const formatDate = (d: Date | null) => {
    if (!d) return null
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const currentPhaseIndex = allPhases.indexOf(project.phase)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground transition-colors">
          Projects
        </Link>
        <span>/</span>
        <span className="text-foreground">{project.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] px-2 py-0.5",
                statusColors[project.status] || "bg-zinc-500/10 text-zinc-400"
              )}
            >
              {project.status.replace("_", " ")}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] px-2 py-0.5 border",
                phaseColors[project.phase] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
              )}
            >
              {phaseLabels[project.phase] || project.phase}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/60">
            {project.entity && (
              <Link
                href={`/entities/${project.entity.id}`}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Building2 className="h-3 w-3" />
                <span>{project.entity.name}</span>
              </Link>
            )}
            {project.budget && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                ${project.budget.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/projects/${project.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <Link href={`/projects/${project.id}/edit`}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <Card className="border-0 bg-[#111111]">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold tabular-nums">{project.progress}%</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                progressColor(project.progress)
              )}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick stat cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {[
          {
            label: "Budget",
            value: project.budget
              ? `$${project.budget.toLocaleString()}`
              : "—",
            icon: DollarSign,
            color: "text-emerald-400",
          },
          {
            label: "Tasks",
            value: `${openTasks} open / ${doneTasks} done`,
            icon: CheckSquare,
            color: "text-violet-400",
          },
          {
            label: "Start Date",
            value: project.startDate
              ? new Date(project.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—",
            icon: Calendar,
            color: "text-sky-400",
          },
          {
            label: "Target Date",
            value: project.targetDate
              ? new Date(project.targetDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—",
            icon: Target,
            color: "text-rose-400",
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-[#111111] p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <div className="text-sm font-bold truncate">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabbed content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-[#111111] border border-white/[0.04] p-1 h-auto gap-0">
          {[
            { key: "overview", label: "Overview", count: null },
            { key: "tasks", label: "Tasks", count: project.tasks.length },
            { key: "documents", label: "Documents", count: project.documents.length },
            { key: "meetings", label: "Meetings", count: project.meetings.length },
          ].map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="text-xs px-4 py-1.5 data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-white text-muted-foreground rounded-md"
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-1.5 text-[10px] text-muted-foreground/50">
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Description */}
          {project.description && (
            <Card className="border-0 bg-[#111111]">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {project.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Timeline / Phase Visualization */}
          <Card className="border-0 bg-[#111111]">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Timeline &amp; Phases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-0 overflow-x-auto pb-2">
                {allPhases.map((phase, idx) => {
                  const isPast = idx < currentPhaseIndex
                  const isCurrent = idx === currentPhaseIndex
                  const isFuture = idx > currentPhaseIndex

                  return (
                    <div key={phase} className="flex items-center">
                      {/* Connector line */}
                      {idx > 0 && (
                        <div
                          className={cn(
                            "h-0.5 w-6 sm:w-10",
                            isPast || isCurrent ? "bg-white/20" : "bg-white/[0.04]"
                          )}
                        />
                      )}
                      {/* Phase node */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div
                          className={cn(
                            "w-3 h-3 rounded-full",
                            isCurrent
                              ? "bg-emerald-500 ring-4 ring-emerald-500/20"
                              : isPast
                              ? "bg-white/30"
                              : "bg-white/[0.06]"
                          )}
                        />
                        <span
                          className={cn(
                            "text-[10px] whitespace-nowrap",
                            isCurrent
                              ? "text-emerald-400 font-medium"
                              : isPast
                              ? "text-muted-foreground/60"
                              : "text-muted-foreground/30"
                          )}
                        >
                          {phaseLabels[phase]}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Budget detail */}
          {project.budget && (
            <Card className="border-0 bg-[#111111]">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  Budget
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">
                    ${project.budget.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">total budget</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Risk Assessment placeholder */}
          <Card className="border-0 bg-[#111111] border border-dashed border-white/[0.05]">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                AI Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 mb-3">
                  <Sparkles className="h-5 w-5 text-violet-400" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  AI-powered risk analysis
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Coming in Phase 4 — get automated risk detection and mitigation suggestions for your projects.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-6">
          <div className="space-y-2">
            {project.tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1a1a1a] mb-4">
                  <CheckSquare className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-base font-medium">No tasks yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tasks linked to this project will appear here.
                </p>
                <Link href="/tasks/new" className="mt-4">
                  <Button variant="outline" size="sm" className="gap-2">
                    <PlusIcon />
                    Add Task
                  </Button>
                </Link>
              </div>
            ) : (
              project.tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-start gap-3 rounded-lg bg-[#111111] hover:bg-[#141414] transition-colors p-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate group-hover:text-white transition-colors">
                        {task.title}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 border", priorityColor(task.priority))}
                      >
                        {task.priority}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0", statusColor(task.status))}
                      >
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(task.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                      {task.assignee && (
                        <span className="text-[11px] text-muted-foreground/60">
                          {task.assignee.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-foreground/40 transition-colors shrink-0 mt-0.5" />
                </Link>
              ))
            )}
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <div className="space-y-2">
            {project.documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1a1a1a] mb-4">
                  <FileText className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-base font-medium">No documents yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Documents linked to this project will appear here.
                </p>
              </div>
            ) : (
              project.documents.map((doc) => {
                const dc = docTypeConfig[doc.type] || docTypeConfig.OTHER
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg bg-[#111111] hover:bg-[#141414] transition-colors p-3"
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                        dc.color
                      )}
                    >
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0", dc.color)}
                        >
                          {doc.type.replace("_", " ")}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground/50">
                          {new Date(doc.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="mt-6">
          <div className="space-y-2">
            {project.meetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1a1a1a] mb-4">
                  <Calendar className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-base font-medium">No meetings yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Meetings linked to this project will appear here.
                </p>
              </div>
            ) : (
              project.meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-start gap-3 rounded-lg bg-[#111111] hover:bg-[#141414] transition-colors p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 shrink-0">
                    <Calendar className="h-4 w-4 text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{meeting.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground/60">
                        {new Date(meeting.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {meeting.location && (
                        <span className="text-[11px] text-muted-foreground/40">
                          {meeting.location}
                        </span>
                      )}
                    </div>
                    {meeting.notes && (
                      <p className="text-xs text-muted-foreground/50 mt-1 line-clamp-1">
                        {meeting.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
