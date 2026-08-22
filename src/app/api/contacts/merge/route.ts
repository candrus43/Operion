import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"
import { mergeContacts } from "@/lib/contact-merge"

// Owner-confirmed merge of duplicate contacts. Never auto-merges: the caller
// (the review page) always passes an explicit keeper + explicit list of
// contacts to absorb. Idempotent and org-isolated.
export async function POST(req: Request) {
  const limit = await applyRateLimit(req, { maxRequests: 20, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id
  const body = await req.json()
  const { keeperId, mergedIds } = body

  if (!keeperId || !Array.isArray(mergedIds) || mergedIds.length === 0) {
    return NextResponse.json({ error: "keeperId and mergedIds are required" }, { status: 400 })
  }
  if (mergedIds.length > 50) {
    return NextResponse.json({ error: "Too many contacts in one merge" }, { status: 400 })
  }

  try {
    const result = await mergeContacts(prisma, { keeperId, mergedIds, orgId, userId })
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Merge failed" }, { status: 400 })
  }
}
