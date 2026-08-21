import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limit = await applyRateLimit(req, { maxRequests: 60, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: taskId } = await params
  const orgId = (session.user as any).organizationId

  // Task must belong to this org (org isolation)
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: orgId },
    select: { id: true },
  })
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  const events = await prisma.taskEvent.findMany({
    where: { taskId, organizationId: orgId },
    orderBy: { at: "desc" },
    take: 60,
  })

  return NextResponse.json(events)
}
