import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { priorityColor, statusColor } from "@/lib/colors"
import { TaskActions } from "./task-actions"
import { AskAiButton } from "@/components/ai/ask-ai-button"
import { TaskTabs } from "./tabs"
import { collectTaskNeedsAttention } from "@/lib/needs-attention"

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
      reviewer: { select: { id: true, name: true } },
      waitingOnUser: { select: { id: true, name: true } },
      dependsOn: { select: { id: true, title: true, status: true } },
      dependedBy: {
        select: { id: true, title: true, status: true, priority: true, dueDate: true },
        take: 10,
      },
    },
  })

  if (!task) notFound()

  const [needsAttention, auditActivity] = await Promise.all([
    collectTaskNeedsAttention(orgId, task.id),
    prisma.auditLog.findMany({
      where: { organizationId: orgId, entity: "Task", entityId: task.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

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
          <AskAiButton type="task" id={task.id} title={task.title} />
          <Link href={`/tasks/${task.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <TaskActions taskId={task.id} currentStatus={task.status} />
        </div>
      </div>

      {/* Command center tabs */}
      <TaskTabs task={task} needsAttention={needsAttention} auditActivity={auditActivity} />
    </div>
  )
}
