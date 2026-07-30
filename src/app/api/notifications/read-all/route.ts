import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

export async function PATCH(req: Request) {
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id

  await prisma.notification.updateMany({
    where: { organizationId: orgId, userId, read: false },
    data: { read: true },
  })

  return NextResponse.json({ success: true })
}
