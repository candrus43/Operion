import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateNotifications } from "@/lib/notifications"
import { applyRateLimit } from "@/lib/rate-limit"

export async function POST(req: Request) {
  const limit = await applyRateLimit(req, { maxRequests: 10, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId

  const count = await generateNotifications(orgId)
  return NextResponse.json({ created: count })
}
