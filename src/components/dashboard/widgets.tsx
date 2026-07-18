import Link from "next/link"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Building2,
  FolderKanban,
  CheckSquare,
  Clock,
  FileText,
  Users,
  AlertTriangle,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  MessageSquare,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Stat Cards ──────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  accent?: string
  subtitle?: string
}

export function StatCard({ label, value, icon: Icon, accent, subtitle }: StatCardProps) {
  return (
    <Card className="border-0 bg-[#111111] hover:bg-[#141414] transition-colors">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={cn("h-4 w-4", accent || "text-muted-foreground")} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold tracking-tight", accent)}>
          {value.toLocaleString()}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Critical Tasks Widget ───────────────────────────────────────

interface CriticalTasksProps {
  orgId: string
}

export async function CriticalTasks({ orgId }: CriticalTasksProps) {
  const tasks = await prisma.task.findMany({
    where: {
      organizationId: orgId,
      priority: "CRITICAL",
      status: { not: "DONE" },
    },
    include: { assignee: true, project: true, entity: true },
    orderBy: { dueDate: "asc" },
    take: 6,
  })

  const priorityColor = (p: string) => {
    switch (p) {
      case "CRITICAL": return "bg-red-500/10 text-red-400 border-red-500/20"
      case "HIGH": return "bg-orange-500/10 text-orange-400 border-orange-500/20"
      case "MEDIUM": return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
    }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case "WAITING_ON": return "text-amber-400 bg-amber-500/10"
      case "BLOCKED": return "text-red-400 bg-red-500/10"
      case "IN_PROGRESS": return "text-blue-400 bg-blue-500/10"
      case "TODO": return "text-zinc-400 bg-zinc-500/10"
      default: return "text-zinc-400 bg-zinc-500/10"
    }
  }

  return (
    <Card className="border-0 bg-[#111111]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
          </div>
          <CardTitle className="text-base">Critical Tasks</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-3">
              <CheckSquare className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-foreground/80">No critical tasks</p>
            <p className="text-xs text-muted-foreground mt-1">Great job — nothing is on fire!</p>
          </div>
        ) : (
          tasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="flex items-start gap-3 rounded-lg bg-[#1a1a1a] hover:bg-[#1e1e1e] transition-colors p-3 group cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-white transition-colors">
                  {task.title}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", priorityColor(task.priority))}>
                    {task.priority}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColor(task.status))}>
                    {task.status.replace("_", " ")}
                  </Badge>
                  {task.project && (
                    <span className="text-[11px] text-muted-foreground/60 truncate">{task.project.name}</span>
                  )}
                </div>
                {task.dueDate && (
                  <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground/60">
                    <Calendar className="h-2.5 w-2.5" />
                    {task.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {task.dueDate < new Date() && (
                      <span className="text-red-400 ml-1">Overdue</span>
                    )}
                  </div>
                )}
              </div>
              {task.assignee && (
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="text-[10px] bg-[#222]">
                    {task.assignee.name?.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
              )}
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// ── Upcoming Deadlines Widget ───────────────────────────────────

interface UpcomingDeadlinesProps {
  orgId: string
}

export async function UpcomingDeadlines({ orgId }: UpcomingDeadlinesProps) {
  const now = new Date()
  const sevenDays = new Date(now)
  sevenDays.setDate(now.getDate() + 7)

  const tasks = await prisma.task.findMany({
    where: {
      organizationId: orgId,
      status: { not: "DONE" },
      dueDate: { gte: now, lte: sevenDays },
    },
    include: { project: true, assignee: true },
    orderBy: { dueDate: "asc" },
    take: 8,
  })

  const getDaysUntil = (date: Date): string => {
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return "Today"
    if (diff === 1) return "Tomorrow"
    return `${diff} days`
  }

  const getUrgencyClass = (days: number): string => {
    if (days <= 1) return "text-red-400 bg-red-500/10"
    if (days <= 3) return "text-amber-400 bg-amber-500/10"
    return "text-blue-400 bg-blue-500/10"
  }

  return (
    <Card className="border-0 bg-[#111111]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
            <Calendar className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-3">
              <Calendar className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-foreground/80">No upcoming deadlines</p>
            <p className="text-xs text-muted-foreground mt-1">The next 7 days are clear</p>
          </div>
        ) : (
          tasks.map((task) => {
            const days = Math.ceil((task.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            return (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center gap-3 rounded-lg bg-[#1a1a1a] hover:bg-[#1e1e1e] transition-colors p-3 group cursor-pointer"
              >
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                  getUrgencyClass(days)
                )}>
                  {getDaysUntil(task.dueDate!)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-white transition-colors">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {task.project && (
                      <span className="text-[11px] text-muted-foreground/60 truncate">{task.project.name}</span>
                    )}
                    {task.assignee && (
                      <span className="text-[10px] text-muted-foreground/40">
                        · {task.assignee.name?.split(" ")[0]}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-foreground/40 transition-colors shrink-0" />
              </Link>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

// ── Active Projects Widget ──────────────────────────────────────

interface ActiveProjectsProps {
  orgId: string
}

export async function ActiveProjects({ orgId }: ActiveProjectsProps) {
  const projects = await prisma.project.findMany({
    where: {
      organizationId: orgId,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    include: { entity: true, _count: { select: { tasks: true } } },
    orderBy: { progress: "asc" },
    take: 6,
  })

  const statusColor = (s: string) => {
    switch (s) {
      case "ACTIVE": return "bg-emerald-500/10 text-emerald-400"
      case "ON_HOLD": return "bg-amber-500/10 text-amber-400"
      default: return "bg-zinc-500/10 text-zinc-400"
    }
  }

  return (
    <Card className="border-0 bg-[#111111]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
            <FolderKanban className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <CardTitle className="text-base">Active Projects</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-500/10 mb-3">
              <FolderKanban className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground/80">No active projects</p>
            <p className="text-xs text-muted-foreground mt-1">Start a new project to see it here</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="rounded-lg bg-[#1a1a1a] hover:bg-[#1e1e1e] transition-colors p-3 group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-white transition-colors">
                    {project.name}
                  </p>
                  {project.entity && (
                    <p className="text-[11px] text-muted-foreground/50 truncate mt-0.5">
                      {project.entity.name}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 ml-2 shrink-0", statusColor(project.status))}>
                  {project.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {project.progress}% complete
                  </span>
                  <span className="text-muted-foreground/50">
                    {project._count.tasks} tasks
                  </span>
                </div>
                <Progress value={project.progress} className="h-1.5" />
              </div>
              {project.targetDate && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/50">
                  <Calendar className="h-2.5 w-2.5" />
                  Target: {project.targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// ── Recent Activity Widget ──────────────────────────────────────

interface ActivityFeedProps {
  orgId: string
}

type ActivityItem = {
  type: "task" | "comment"
  id: string
  timestamp: Date
  userName: string
  taskTitle: string
  taskId: string
  description: string
  projectName?: string
}

const timeAgo = (date: Date): string => {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export async function ActivityFeed({ orgId }: ActivityFeedProps) {
  const [recentTasks, recentComments] = await Promise.all([
    prisma.task.findMany({
      where: { organizationId: orgId },
      include: { assignee: true, project: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.comment.findMany({
      where: { organizationId: orgId },
      include: {
        author: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, project: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ])

  const getTaskDescription = (task: typeof recentTasks[0]): string => {
    switch (task.status) {
      case "DONE": return "marked complete"
      case "IN_PROGRESS": return "started working on"
      case "BLOCKED": return "marked blocked"
      case "WAITING_ON": return "marked waiting on others"
      default: return "updated"
    }
  }

  const getTaskEmoji = (task: typeof recentTasks[0]): string => {
    switch (task.status) {
      case "DONE": return "✅"
      case "IN_PROGRESS": return "▶️"
      case "BLOCKED": return "🚫"
      case "WAITING_ON": return "⏳"
      default: return "📝"
    }
  }

  // Merge into unified timeline
  const items: ActivityItem[] = [
    ...recentTasks.map((t) => ({
      type: "task" as const,
      id: t.id,
      timestamp: t.updatedAt,
      userName: t.assignee?.name?.split(" ")[0] || "Someone",
      taskTitle: t.title,
      taskId: t.id,
      description: getTaskDescription(t),
      projectName: t.project?.name,
    })),
    ...recentComments.map((c) => ({
      type: "comment" as const,
      id: c.id,
      timestamp: c.createdAt,
      userName: c.author.name.split(" ")[0],
      taskTitle: c.task.title,
      taskId: c.task.id,
      description: `commented on`,
      projectName: c.task.project?.name,
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8)

  return (
    <Card className="border-0 bg-[#111111]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
            <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-500/10 mb-3">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground/80">No activity yet</p>
            <p className="text-xs text-muted-foreground mt-1">Updates will appear here as your team works</p>
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={`/tasks/${item.taskId}`}
              className="flex items-start gap-3 rounded-lg hover:bg-[#1a1a1a] transition-colors px-3 py-2 group cursor-pointer"
            >
              <span className="text-sm shrink-0 mt-0.5">
                {item.type === "comment" ? "💬" : "📝"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs">
                  <span className="font-medium text-foreground/80">
                    {item.userName}
                  </span>{" "}
                  <span className="text-muted-foreground">{item.description}</span>{" "}
                  <span className="font-medium text-foreground/70 truncate">
                    &apos;{item.taskTitle}&apos;
                  </span>
                </p>
                {item.projectName && (
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                    {item.projectName}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground/40 shrink-0 mt-0.5">
                {timeAgo(item.timestamp)}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// ── Waiting On Widget ───────────────────────────────────────────

interface WaitingOnProps {
  orgId: string
}

export async function WaitingOn({ orgId }: WaitingOnProps) {
  const tasks = await prisma.task.findMany({
    where: {
      organizationId: orgId,
      status: { in: ["WAITING_ON", "BLOCKED"] },
    },
    include: { assignee: true, project: true, entity: true },
    orderBy: { dueDate: "asc" },
    take: 8,
  })

  return (
    <Card className="border-0 bg-[#111111]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base">Waiting On Others</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tasks.length} {tasks.length === 1 ? "item" : "items"} blocked on external parties
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-3">
              <CheckSquare className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-foreground/80">No blocked items</p>
            <p className="text-xs text-muted-foreground mt-1">Everything is moving forward</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="rounded-lg bg-[#1a1a1a] hover:bg-[#1e1e1e] transition-colors p-3 group cursor-pointer border-l-2 border-amber-500/30 hover:border-amber-500/50"
              >
                <p className="text-sm font-medium truncate group-hover:text-white transition-colors">
                  {task.title}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      task.status === "BLOCKED"
                        ? "text-red-400 bg-red-500/10 border-red-500/20"
                        : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    )}
                  >
                    {task.status === "WAITING_ON" ? "WAITING" : "BLOCKED"}
                  </Badge>
                  {task.assignee && (
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-[8px] bg-[#222]">
                          {task.assignee.name?.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-muted-foreground/70">
                        {task.assignee.name?.split(" ")[0]}
                      </span>
                    </div>
                  )}
                </div>
                {task.notes && (
                  <p className="text-[10px] text-muted-foreground/50 mt-1.5 line-clamp-1 italic">
                    {task.notes}
                  </p>
                )}
                {task.dueDate && (
                  <p className="text-[10px] text-muted-foreground/40 mt-1">
                    Due {task.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
