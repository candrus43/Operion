import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"
import { unmergeContact } from "@/lib/contact-merge"

// Reverse a previously-owner-confirmed contact merge from its stored
// ContactMerge reversibility record. Idempotent and org-isolated.
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
  const { mergeId } = body

  if (!mergeId) {
    return NextResponse.json({ error: "mergeId is required" }, { status: 400 })
  }

  try {
    const result = await unmergeContact(prisma, { mergeId, orgId, userId })
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unmerge failed" }, { status: 400 })
  }
}
