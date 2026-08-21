import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Pencil,
  Trash2,
  CheckSquare,
  Calendar,
  Building2,
  DollarSign,
  Target,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { projectStatusColor, phaseColor } from "@/lib/colors"
import { AskAiButton } from "@/components/ai/ask-ai-button"
import { ProjectTabs } from "./tabs"
import { collectProjectNeedsAttention } from "@/lib/needs-attention"

const phaseLabels: Record<string, string> = {
  ACQUISITION: "Acquisition",
  DUE_DILIGENCE: "Due Diligence",
  DESIGN: "Design",
  PERMITTING: "Permitting",
  CONSTRUCTION: "Construction",
  CLOSEOUT: "Closeout",
  OPERATIONS: "Operations",
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

  const [needsAttention, activity] = await Promise.all([
    collectProjectNeedsAttention(orgId, project.id),
    prisma.auditLog.findMany({
      where: { organizationId: orgId, entity: "Project", entityId: project.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ])

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
              className={cn("text-[11px] px-2 py-0.5", projectStatusColor(project.status))}
            >
              {project.status.replace("_", " ")}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-[11px] px-2 py-0.5 border", phaseColor(project.phase))}
            >
              {phaseLabels[project.phase] || project.phase}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
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
          <AskAiButton type="project" id={project.id} title={project.name} />
          <Link href={`/projects/${project.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <Link href={`/projects/${project.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-red-400 hover:text-red-300">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick stat cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Budget", value: project.budget ? `${project.budget.toLocaleString()}` : "—", icon: DollarSign, color: "text-emerald-400" },
          { label: "Tasks", value: `${openTasks} open / ${doneTasks} done`, icon: CheckSquare, color: "text-violet-400" },
          { label: "Start Date", value: project.startDate ? new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—", icon: Calendar, color: "text-sky-400" },
          { label: "Target Date", value: project.targetDate ? new Date(project.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—", icon: Target, color: "text-rose-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl glass p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <div className="text-sm font-bold truncate">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Command center tabs */}
      <ProjectTabs project={project} needsAttention={needsAttention} activity={activity} />
    </div>
  )
}

