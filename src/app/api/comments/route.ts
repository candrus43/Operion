import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get("taskId")
  const authorId = searchParams.get("authorId")
  const limitParam = searchParams.get("limit")
  const take = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 20), 100) : 20

  const where: any = { organizationId: orgId }
  if (taskId) where.taskId = taskId
  if (authorId) where.authorId = authorId

  const comments = await prisma.comment.findMany({
    where,
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
      task: {
        select: { id: true, title: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  })

  return NextResponse.json(comments)
}
