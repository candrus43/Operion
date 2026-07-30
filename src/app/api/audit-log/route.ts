import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

export async function GET(req: Request) {
  const limit = await applyRateLimit(req, { maxRequests: 60, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const userRole = (session.user as any).role

  // Only OWNER and EXECUTIVE_ASSISTANT can view audit logs
  if (userRole !== "OWNER" && userRole !== "EXECUTIVE_ASSISTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json(logs)
}
