import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  PlayCircle,
  AlertTriangle,
  Ban,
  Link2,
  Building2,
  FolderKanban,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TaskActions } from "./task-actions"
import { AISuggestion } from "./ai-suggestion"
import { TaskDiscussion } from "./task-discussion"

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
    case "WAITING_ON": return "text-amber-400 bg-amber-500/10 border-amber-500/20"
    case "BLOCKED": return "text-red-400 bg-red-500/10 border-red-500/20"
    case "IN_PROGRESS": return "text-blue-400 bg-blue-500/10 border-blue-500/20"
    case "DONE": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    case "TODO": return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"
    default: return "text-zinc-400 bg-zinc-500/10"
  }
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const orgId = (session.user as any).organizationId

  const task = await prisma.task.findFirst({
    where: { id, organizationId: orgId },
    include: {
      assignee: true,
      createdBy: true,
      project: true,
      entity: true,
      dependsOn: { select: { id: true, title: true, status: true } },
      dependedBy: {
        select: { id: true, title: true, status: true, priority: true, dueDate: true },
        take: 10,
      },
    },
  })

  if (!task) notFound()

  const isOverdue = task.dueDate && task.dueDate < new Date() && task.status !== "DONE"

  // Parse dates for display
  const formatDate = (d: Date | null) => {
    if (!d) return null
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tasks">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
            <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 border", priorityColor(task.priority))}>
              {task.priority}
            </Badge>
            <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 border", statusColor(task.status))}>
              {task.status.replace("_", " ")}
            </Badge>
          </div>
          {task.category && (
            <p className="text-xs text-muted-foreground mt-1">{task.category}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/tasks/${task.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <TaskActions taskId={task.id} currentStatus={task.status} />
        </div>
      </div>

      {/* WAITING_ON / BLOCKED callout */}
      {(task.status === "WAITING_ON" || task.status === "BLOCKED") && (
        <div className={cn(
          "rounded-xl p-4 border",
          task.status === "WAITING_ON"
            ? "bg-amber-500/5 border-amber-500/20"
            : "bg-red-500/5 border-red-500/20"
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5",
              task.status === "WAITING_ON" ? "bg-amber-500/10" : "bg-red-500/10"
            )}>
              {task.status === "WAITING_ON" ? (
                <Clock className={cn("h-4 w-4", task.status === "WAITING_ON" ? "text-amber-400" : "text-red-400")} />
              ) : (
                <Ban className="h-4 w-4 text-red-400" />
              )}
            </div>
            <div>
              <p className={cn(
                "text-sm font-semibold",
                task.status === "WAITING_ON" ? "text-amber-300" : "text-red-300"
              )}>
                {task.status === "WAITING_ON" ? "Waiting on External Party" : "Task is Blocked"}
              </p>
              {task.notes && (
                <p className="text-sm text-muted-foreground mt-1">{task.notes}</p>
              )}
              {!task.notes && (
                <p className="text-sm text-muted-foreground mt-1">
                  {task.status === "WAITING_ON"
                    ? "This task is waiting on input, deliverables, or action from someone outside the team."
                    : "This task cannot proceed due to a blocker."
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="border-0 bg-[#111111]">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">No description provided.</p>
              )}
            </CardContent>
          </Card>

          {/* Dependencies */}
          {task.dependsOn && (
            <Card className="border-0 bg-[#111111]">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-amber-400" />
                  Dependency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 rounded-lg bg-[#1a1a1a] p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Blocked by:</p>
                    <Link
                      href={`/tasks/${task.dependsOn.id}`}
                      className="text-sm font-medium hover:text-white transition-colors"
                    >
                      {task.dependsOn.title}
                    </Link>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColor(task.dependsOn.status))}>
                    {task.dependsOn.status.replace("_", " ")}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Depended by */}
          {task.dependedBy.length > 0 && (
            <Card className="border-0 bg-[#111111]">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-blue-400" />
                  Blocking ({task.dependedBy.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground">These tasks depend on this one being completed</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {task.dependedBy.map((dep) => (
                  <Link
                    key={dep.id}
                    href={`/tasks/${dep.id}`}
                    className="flex items-center gap-3 rounded-lg bg-[#1a1a1a] hover:bg-[#1e1e1e] p-3 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate group-hover:text-white transition-colors">{dep.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColor(dep.status))}>
                          {dep.status.replace("_", " ")}
                        </Badge>
                        {dep.priority === "CRITICAL" && (
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priorityColor(dep.priority))}>
                            {dep.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-foreground/40 transition-colors" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {task.notes && (
            <Card className="border-0 bg-[#111111]">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* AI Suggestion */}
          <AISuggestion taskId={task.id} existingSuggestion={task.aiSuggestion} />

          {/* Discussion */}
          <TaskDiscussion taskId={task.id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Info */}
          <Card className="border-0 bg-[#111111]">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Assignee */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Assignee</span>
                {task.assignee ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[9px] bg-[#222]">
                        {task.assignee.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{task.assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/50">Unassigned</span>
                )}
              </div>

              {/* Created by */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Created by</span>
                {task.createdBy ? (
                  <span className="text-xs">{task.createdBy.name}</span>
                ) : (
                  <span className="text-xs text-muted-foreground/50">—</span>
                )}
              </div>

              {/* Project */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Project</span>
                {task.project ? (
                  <Link href={`/projects/${task.project.id}`} className="text-xs hover:text-white transition-colors flex items-center gap-1">
                    <FolderKanban className="h-3 w-3" />
                    {task.project.name}
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground/50">—</span>
                )}
              </div>

              {/* Entity */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Entity</span>
                {task.entity ? (
                  <Link href={`/entities/${task.entity.id}`} className="text-xs hover:text-white transition-colors flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {task.entity.name}
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground/50">—</span>
                )}
              </div>

              {/* Due Date */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Due Date</span>
                {task.dueDate ? (
                  <div className={cn(
                    "flex items-center gap-1 text-xs",
                    isOverdue ? "text-red-400" : ""
                  )}>
                    <Calendar className="h-3 w-3" />
                    {formatDate(task.dueDate)}
                    {isOverdue && <span className="text-[10px] ml-1">OVERDUE</span>}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/50">—</span>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.03]">
                <span className="text-xs text-muted-foreground">Status</span>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColor(task.status))}>
                  {task.status.replace("_", " ")}
                </Badge>
              </div>

              {/* Created / Updated */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Created</span>
                <span className="text-xs text-muted-foreground">
                  {task.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Updated</span>
                <span className="text-xs text-muted-foreground">
                  {task.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Status Actions */}
          <Card className="border-0 bg-[#111111]">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {task.status !== "IN_PROGRESS" && (
                <form action={async () => {
                  "use server"
                  const { auth } = await import("@/lib/auth")
                  const { prisma } = await import("@/lib/db")
                  const s = await auth()
                  if (!s?.user) return
                  await prisma.task.update({ where: { id: task.id }, data: { status: "IN_PROGRESS" } })
                }}>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2" type="submit">
                    <PlayCircle className="h-4 w-4 text-blue-400" />
                    Mark In Progress
                  </Button>
                </form>
              )}
              {task.status !== "DONE" && (
                <form action={async () => {
                  "use server"
                  const { auth } = await import("@/lib/auth")
                  const { prisma } = await import("@/lib/db")
                  const s = await auth()
                  if (!s?.user) return
                  await prisma.task.update({ where: { id: task.id }, data: { status: "DONE" } })
                }}>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2" type="submit">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Mark Done
                  </Button>
                </form>
              )}
              {task.status !== "BLOCKED" && (
                <form action={async () => {
                  "use server"
                  const { auth } = await import("@/lib/auth")
                  const { prisma } = await import("@/lib/db")
                  const s = await auth()
                  if (!s?.user) return
                  await prisma.task.update({ where: { id: task.id }, data: { status: "BLOCKED" } })
                }}>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2" type="submit">
                    <Ban className="h-4 w-4 text-red-400" />
                    Mark Blocked
                  </Button>
                </form>
              )}
              {task.status !== "WAITING_ON" && (
                <form action={async () => {
                  "use server"
                  const { auth } = await import("@/lib/auth")
                  const { prisma } = await import("@/lib/db")
                  const s = await auth()
                  if (!s?.user) return
                  await prisma.task.update({ where: { id: task.id }, data: { status: "WAITING_ON" } })
                }}>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2" type="submit">
                    <Clock className="h-4 w-4 text-amber-400" />
                    Mark Waiting
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
