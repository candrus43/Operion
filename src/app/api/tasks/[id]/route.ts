import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/permissions"

// ── Audit log helper ────────────────────────────────────────────────

async function createAuditLog(params: {
  organizationId: string
  userId: string
  action: string
  entity: string
  entityId: string
  details?: string
}) {
  await prisma.auditLog.create({ data: params })
}

// ── Notification helpers ──────────────────────────────────────────

interface TaskSnapshot {
  assigneeId: string | null
  status: string
  title: string
  createdById: string | null
}

interface Actor {
  id: string
  name: string
  organizationId: string
}

async function createTaskNotifications(
  oldTask: TaskSnapshot,
  newTask: { assigneeId: string | null; status: string; title: string },
  actor: Actor
) {
  const orgId = actor.organizationId
  const taskId = (newTask as any).id
  const notifications: any[] = []

  // 1. Task assignment: new assignee gets notified
  const newAssigneeId = newTask.assigneeId || null
  if (newAssigneeId && newAssigneeId !== oldTask.assigneeId) {
    notifications.push({
      organizationId: orgId,
      userId: newAssigneeId,
      type: "ASSIGNED",
      title: "Task assigned",
      message: `${actor.name} assigned you a task: ${newTask.title}`,
      link: `/tasks/${taskId}`,
    })
  }

  // 2. Task completion: creator gets notified (if not self-completing)
  if (
    newTask.status === "DONE" &&
    oldTask.status !== "DONE" &&
    oldTask.createdById &&
    oldTask.createdById !== actor.id
  ) {
    notifications.push({
      organizationId: orgId,
      userId: oldTask.createdById,
      type: "COMPLETED",
      title: "Task completed",
      message: `${actor.name} completed a task you created: ${newTask.title}`,
      link: `/tasks/${taskId}`,
    })
  }

  // 3. Status changed to WAITING_ON: assignee gets notified
  if (
    newTask.status === "WAITING_ON" &&
    oldTask.status !== "WAITING_ON" &&
    newAssigneeId
  ) {
    notifications.push({
      organizationId: orgId,
      userId: newAssigneeId,
      type: "WAITING",
      title: "Task waiting",
      message: `Your task is now waiting: ${newTask.title}`,
      link: `/tasks/${taskId}`,
    })
  }

  // 4. Task unblocked: moving from WAITING_ON or BLOCKED → IN_PROGRESS or TODO
  const wasBlocked = oldTask.status === "WAITING_ON" || oldTask.status === "BLOCKED"
  const isNowActive = newTask.status === "IN_PROGRESS" || newTask.status === "TODO"
  if (wasBlocked && isNowActive && newAssigneeId) {
    notifications.push({
      organizationId: orgId,
      userId: newAssigneeId,
      type: "UNBLOCKED",
      title: "Task unblocked",
      message: `A task you're waiting on is unblocked: ${newTask.title}`,
      link: `/tasks/${taskId}`,
    })
  }

  // Fire all notifications in parallel (fire-and-forget — we don't await in the handler)
  if (notifications.length > 0) {
    await Promise.all(notifications.map((n) => prisma.notification.create({ data: n })))
  }
}

// ── Route handlers ────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
        select: { id: true, title: true, status: true, priority: true },
        take: 10,
      },
    },
  })

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(task)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id
  const userName = (session.user as any).name || "Someone"

  const existing = await prisma.task.findFirst({
    where: { id, organizationId: orgId },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Snapshot old state before update
  const oldSnapshot: TaskSnapshot = {
    assigneeId: existing.assigneeId,
    status: existing.status,
    title: existing.title,
    createdById: existing.createdById,
  }

  const body = await req.json()
  const { title, description, status, priority, dueDate, category, projectId, entityId, assigneeId, notes, dependsOnId } = body

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : existing.dueDate }),
      ...(category !== undefined && { category }),
      ...(projectId !== undefined && { projectId: projectId || null }),
      ...(entityId !== undefined && { entityId: entityId || null }),
      ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      ...(notes !== undefined && { notes }),
      ...(dependsOnId !== undefined && { dependsOnId: dependsOnId || null }),
    },
    include: {
      assignee: true,
      createdBy: true,
      project: true,
      entity: true,
      dependsOn: { select: { id: true, title: true, status: true } },
      dependedBy: {
        select: { id: true, title: true, status: true, priority: true },
        take: 10,
      },
    },
  })

  // Fire-and-forget: create notifications without blocking the response
  const actor: Actor = { id: userId, name: userName, organizationId: orgId }
  void createTaskNotifications(oldSnapshot, task, actor)

  // Fire-and-forget: audit log
  void createAuditLog({
    organizationId: orgId,
    userId,
    action: "UPDATE",
    entity: "Task",
    entityId: task.id,
    details: JSON.stringify({ title: task.title, status: task.status }),
  })

  return NextResponse.json(task)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id
  const userRole = (session.user as any).role

  const existing = await prisma.task.findFirst({
    where: { id, organizationId: orgId },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // OWNER, EA, or task creator can delete
  const allowedRoles = ["OWNER", "EXECUTIVE_ASSISTANT"]
  const isCreator = existing.createdById === userId
  if (!allowedRoles.includes(userRole) && !isCreator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Clear dependency references before deleting
  await prisma.task.updateMany({
    where: { dependsOnId: id },
    data: { dependsOnId: null },
  })

  await prisma.task.delete({ where: { id } })

  // Fire-and-forget: audit log
  void createAuditLog({
    organizationId: orgId,
    userId,
    action: "DELETE",
    entity: "Task",
    entityId: id,
    details: JSON.stringify({ title: existing.title }),
  })

  return NextResponse.json({ success: true })
}
