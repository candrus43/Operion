import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: taskId } = await params
  const orgId = (session.user as any).organizationId

  // Verify task exists and belongs to org
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: orgId },
    select: { id: true },
  })
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  const comments = await prisma.comment.findMany({
    where: { taskId, organizationId: orgId },
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(comments)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: taskId } = await params
  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id
  const userName = (session.user as any).name

  // Verify task exists and belongs to org
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: orgId },
    select: { id: true, title: true },
  })
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  const body = await req.json()
  const { content } = body

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 })
  }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      taskId,
      authorId: userId,
      organizationId: orgId,
    },
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
    },
  })

  // Check for @mentions and create notifications
  const mentionRegex = /@([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/g
  const mentionedNames: string[] = []
  let match
  while ((match = mentionRegex.exec(content)) !== null) {
    mentionedNames.push(match[1].trim())
  }

  if (mentionedNames.length > 0) {
    // Look up users by name in the same org
    const mentionedUsers = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        name: { in: mentionedNames },
        id: { not: userId }, // Don't notify self
      },
      select: { id: true, name: true },
    })

    if (mentionedUsers.length > 0) {
      const commentPreview = content.length > 100 ? content.substring(0, 97) + "..." : content
      await prisma.notification.createMany({
        data: mentionedUsers.map((u) => ({
          organizationId: orgId,
          userId: u.id,
          type: "MENTION",
          title: `${userName || "Someone"} mentioned you`,
          message: `in "${task.title}": ${commentPreview}`,
          link: `/tasks/${taskId}`,
          read: false,
        })),
      })
    }
  }

  return NextResponse.json(comment, { status: 201 })
}
