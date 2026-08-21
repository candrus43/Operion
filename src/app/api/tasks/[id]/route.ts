import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/permissions"
import { generateNotifications } from "@/lib/notifications"
import { applyRateLimit } from "@/lib/rate-limit"
import { createTaskEvent } from "@/lib/task-events"

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
  const limit = await applyRateLimit(req, { maxRequests: 60, windowMs: 60_000 })
  if (limit) return limit

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
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fix 1: Gate PATCH to EA+ roles
  const roleCheck = await requireRole("EXECUTIVE_ASSISTANT")
  if (roleCheck instanceof NextResponse) return roleCheck

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
  const {
    title, description, status, priority, dueDate, category, projectId, entityId, assigneeId, notes, dependsOnId, waitingOnUserId,
    // Phase 1d status-workflow fields
    blockedReason, blockedSince, waitingOn, waitingOnSince, expectedResolutionDate, escalationOwner,
    reviewRequestedAt, reviewRequiredBy, reviewedById, reviewedAt, approvalStatus,
    whatRequired, relatedContact,
  } = body

  // Capture structured status-workflow details for the activity feed
  const workflow: Record<string, unknown> = {}
  if (blockedReason !== undefined) workflow.blockedReason = blockedReason
  if (waitingOn !== undefined) workflow.waitingOn = waitingOn
  if (expectedResolutionDate !== undefined) workflow.expectedResolutionDate = expectedResolutionDate ? new Date(expectedResolutionDate).toISOString() : null
  if (escalationOwner !== undefined) workflow.escalationOwner = escalationOwner
  if (reviewRequiredBy !== undefined) workflow.reviewRequiredBy = reviewRequiredBy ? new Date(reviewRequiredBy).toISOString() : null
  if (reviewedById !== undefined) workflow.reviewedById = reviewedById
  if (approvalStatus !== undefined) workflow.approvalStatus = approvalStatus
  if (whatRequired !== undefined) workflow.whatRequired = whatRequired
  if (relatedContact !== undefined) workflow.relatedContact = relatedContact

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
      ...(waitingOnUserId !== undefined && { waitingOnUserId: waitingOnUserId || null }),
      // Phase 1d status-workflow fields
      ...(blockedReason !== undefined && { blockedReason }),
      ...(blockedSince !== undefined && { blockedSince: blockedSince ? new Date(blockedSince) : null }),
      ...(waitingOn !== undefined && { waitingOn }),
      ...(waitingOnSince !== undefined && { waitingOnSince: waitingOnSince ? new Date(waitingOnSince) : null }),
      ...(expectedResolutionDate !== undefined && { expectedResolutionDate: expectedResolutionDate ? new Date(expectedResolutionDate) : null }),
      ...(escalationOwner !== undefined && { escalationOwner }),
      ...(reviewRequestedAt !== undefined && { reviewRequestedAt: reviewRequestedAt ? new Date(reviewRequestedAt) : null }),
      ...(reviewRequiredBy !== undefined && { reviewRequiredBy: reviewRequiredBy ? new Date(reviewRequiredBy) : null }),
      ...(reviewedById !== undefined && { reviewedById: reviewedById || null }),
      ...(reviewedAt !== undefined && { reviewedAt: reviewedAt ? new Date(reviewedAt) : null }),
      ...(approvalStatus !== undefined && { approvalStatus }),
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

  // ── Phase 1d: activity-feed events (status / workflow / assignee / due) ──
  const statusChanged = status !== undefined && status !== oldSnapshot.status
  const newAssigneeId = assigneeId !== undefined ? (assigneeId || null) : null
  const assigneeChanged = assigneeId !== undefined && newAssigneeId !== oldSnapshot.assigneeId
  const newDue = dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined
  const oldDueTime = existing.dueDate ? new Date(existing.dueDate).getTime() : null
  const dueChanged = newDue !== undefined && (newDue ? newDue.getTime() : null) !== oldDueTime

  if (approvalStatus === "APPROVED") {
    void createTaskEvent({ taskId: task.id, organizationId: orgId, actorId: userId, actorName: userName, action: "REVIEW_APPROVED", details: { workflow } })
  } else if (approvalStatus === "REJECTED") {
    void createTaskEvent({ taskId: task.id, organizationId: orgId, actorId: userId, actorName: userName, action: "REVIEW_REJECTED", details: { workflow } })
  } else if (approvalStatus === "CHANGES_REQUESTED") {
    void createTaskEvent({ taskId: task.id, organizationId: orgId, actorId: userId, actorName: userName, action: "REVIEW_REQUESTED_CHANGES", details: { workflow } })
  } else if (statusChanged) {
    if (status === "BLOCKED") {
      void createTaskEvent({ taskId: task.id, organizationId: orgId, actorId: userId, actorName: userName, action: "BLOCKED", details: { from: oldSnapshot.status, ...workflow } })
    } else if (status === "WAITING_ON") {
      void createTaskEvent({ taskId: task.id, organizationId: orgId, actorId: userId, actorName: userName, action: "WAITING_ON", details: { from: oldSnapshot.status, ...workflow } })
    } else if (status === "READY_FOR_REVIEW") {
      void createTaskEvent({ taskId: task.id, organizationId: orgId, actorId: userId, actorName: userName, action: "REVIEW_SUBMITTED", details: { from: oldSnapshot.status, ...workflow } })
    } else {
      void createTaskEvent({ taskId: task.id, organizationId: orgId, actorId: userId, actorName: userName, action: "STATUS_CHANGE", details: { from: oldSnapshot.status, to: status } })
    }
  }
  if (assigneeChanged) {
    void createTaskEvent({ taskId: task.id, organizationId: orgId, actorId: userId, actorName: userName, action: "ASSIGNEE_CHANGE", details: { assigneeId: newAssigneeId } })
  }
  if (dueChanged) {
    void createTaskEvent({ taskId: task.id, organizationId: orgId, actorId: userId, actorName: userName, action: "DUE_CHANGE", details: { dueDate: newDue ? newDue.toISOString() : null } })
  }

  // Fire-and-forget: trigger system notification generation on key changes
  const statusChangedToDone = status === "DONE" && oldSnapshot.status !== "DONE"
  const dueDateChanged = dueDate !== undefined
  if (statusChangedToDone || dueDateChanged) {
    void generateNotifications(orgId).catch((err) => {
      console.error("Failed to generate notifications on task mutation:", err)
    })
  }

  return NextResponse.json(task)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

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
