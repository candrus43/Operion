import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  const limit = await applyRateLimit(req, { maxRequests: 60, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = (session.user as any).id
  const orgId = (session.user as any).organizationId
  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get("unread") !== "false"

  const where: any = { organizationId: orgId, userId }
  if (unreadOnly) {
    where.read = false
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json(notifications)
}
