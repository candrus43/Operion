import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isSuperAdmin = (session.user as any).isSuperAdmin
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { userId } = await params

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  // Prevent super admin from deleting themselves
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
        isSuperAdmin: true,
        organization: {
          select: {
            _count: { select: { users: true } },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const orgId = user.organizationId
    const isOnlyUserInOrg = user.organization._count.users <= 1

    // Delete user's related records
    // Notifications
    await prisma.notification.deleteMany({ where: { userId } })
    // Comments
    await prisma.comment.deleteMany({ where: { authorId: userId } })
    // Audit logs
    await prisma.auditLog.deleteMany({ where: { userId } })
    // Executive notes (has cascade, but do it explicitly for safety)
    await prisma.executiveNote.deleteMany({ where: { userId } })
    // Null out task references
    await prisma.task.updateMany({ where: { assigneeId: userId }, data: { assigneeId: null } })
    await prisma.task.updateMany({ where: { createdById: userId }, data: { createdById: null } })
    await prisma.task.updateMany({ where: { waitingOnUserId: userId }, data: { waitingOnUserId: null } })
    // Null out document uploader
    await prisma.document.updateMany({ where: { uploadedById: userId }, data: { uploadedById: null } })
    // Accounts (cascaded but do explicitly)
    await prisma.account.deleteMany({ where: { userId } })
    // Sessions (cascaded but do explicitly)
    await prisma.session.deleteMany({ where: { userId } })

    // Delete the user
    await prisma.user.delete({ where: { id: userId } })

    // If they were the only user in the org, delete the entire org
    if (isOnlyUserInOrg) {
      // Delete all org-level records
      await prisma.notification.deleteMany({ where: { organizationId: orgId } })
      await prisma.comment.deleteMany({ where: { organizationId: orgId } })
      await prisma.auditLog.deleteMany({ where: { organizationId: orgId } })
      await prisma.executiveNote.deleteMany({ where: { organizationId: orgId } })
      await prisma.meeting.deleteMany({ where: { organizationId: orgId } })
      await prisma.document.deleteMany({ where: { organizationId: orgId } })
      await prisma.contact.deleteMany({ where: { organizationId: orgId } })
      await prisma.task.deleteMany({ where: { organizationId: orgId } })
      await prisma.project.deleteMany({ where: { organizationId: orgId } })
      await prisma.entity.deleteMany({ where: { organizationId: orgId } })
      await prisma.supportAccessToken.deleteMany({ where: { organizationId: orgId } })
      // Finally delete the org
      await prisma.organization.delete({ where: { id: orgId } })
    }

    return NextResponse.json({
      success: true,
      deletedOrg: isOnlyUserInOrg,
    })
  } catch (error) {
    console.error("User deletion error:", error)
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
