import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const VALID_ROLES = ["OWNER", "EXECUTIVE_ASSISTANT", "OPERATIONS_MANAGER", "STAFF", "READ_ONLY"]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const currentUserRole = (session.user as any).role
  const currentUserId = (session.user as any).id
  const orgId = (session.user as any).organizationId

  // Only OWNER can change roles
  if (currentUserRole !== "OWNER") {
    return NextResponse.json({ error: "Only owners can change user roles" }, { status: 403 })
  }

  const { id: userId } = await params

  // Prevent owner from changing their own role (safety guard)
  if (userId === currentUserId) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 })
  }

  // Verify user belongs to the same organization
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true, role: true, name: true },
  })

  if (!targetUser || targetUser.organizationId !== orgId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const body = await req.json()
  const { role } = body

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
      { status: 400 }
    )
  }

  const oldRole = targetUser.role

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: currentUserId,
      action: "UPDATE",
      entity: "User",
      entityId: userId,
      details: JSON.stringify({
        changedBy: session.user.name || currentUserId,
        targetUser: targetUser.name,
        oldRole,
        newRole: role,
      }),
    },
  })

  return NextResponse.json(updatedUser)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const currentUserRole = (session.user as any).role
  const currentUserId = (session.user as any).id
  const orgId = (session.user as any).organizationId

  // Only OWNER can remove users
  if (currentUserRole !== "OWNER") {
    return NextResponse.json({ error: "Only owners can remove users" }, { status: 403 })
  }

  const { id: userId } = await params

  // Prevent owner from removing themselves
  if (userId === currentUserId) {
    return NextResponse.json({ error: "You cannot remove yourself from the organization" }, { status: 400 })
  }

  // Verify user belongs to the same organization
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true, name: true, email: true, role: true },
  })

  if (!targetUser || targetUser.organizationId !== orgId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Reassign tasks assigned to this user to null (unassign)
  await prisma.task.updateMany({
    where: { assigneeId: userId, organizationId: orgId },
    data: { assigneeId: null },
  })

  // Delete user's comments
  await prisma.comment.deleteMany({
    where: { authorId: userId, organizationId: orgId },
  })

  // Delete user's notifications
  await prisma.notification.deleteMany({
    where: { userId, organizationId: orgId },
  })

  // Delete user's audit logs
  await prisma.auditLog.deleteMany({
    where: { userId, organizationId: orgId },
  })

  // Delete sessions and accounts
  await prisma.session.deleteMany({ where: { userId } })
  await prisma.account.deleteMany({ where: { userId } })

  // Delete the user
  await prisma.user.delete({ where: { id: userId } })

  // Create audit log for the removal
  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: currentUserId,
      action: "DELETE",
      entity: "User",
      entityId: userId,
      details: JSON.stringify({
        removedBy: session.user.name || currentUserId,
        removedUser: targetUser.name,
        removedEmail: targetUser.email,
        removedRole: targetUser.role,
      }),
    },
  })

  return NextResponse.json({ success: true, removed: { id: userId, name: targetUser.name } })
}
