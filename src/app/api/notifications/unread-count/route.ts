import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  const limit = await applyRateLimit(req, { maxRequests: 120, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = (session.user as any).id
  const orgId = (session.user as any).organizationId

  const count = await prisma.notification.count({
    where: { organizationId: orgId, userId, read: false },
  })

  return NextResponse.json({ count })
}
