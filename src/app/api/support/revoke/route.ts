import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

/**
 * DELETE /api/support/revoke
 * Customer revokes an active support access token.
 * Body: { tokenId?: string } — optional. If omitted, revokes the active token for the org.
 */
export async function DELETE(request: Request) {
  const limit = await applyRateLimit(request, { maxRequests: 20, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user as any).role
  if (role !== "OWNER") {
    return NextResponse.json({ error: "Only organization owners can revoke support access" }, { status: 403 })
  }

  const orgId = (session.user as any).organizationId
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 })
  }

  let body: { tokenId?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  let tokenRecord
  if (body.tokenId) {
    tokenRecord = await prisma.supportAccessToken.findFirst({
      where: { id: body.tokenId, organizationId: orgId },
    })
  } else {
    // Find the active (non-revoked, non-expired) token
    tokenRecord = await prisma.supportAccessToken.findFirst({
      where: {
        organizationId: orgId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    })
  }

  if (!tokenRecord) {
    return NextResponse.json({ error: "No active support session found" }, { status: 404 })
  }

  await prisma.supportAccessToken.update({
    where: { id: tokenRecord.id },
    data: { revokedAt: new Date() },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: (session.user as any).id,
      action: "UPDATE",
      entity: "SupportAccessToken",
      entityId: tokenRecord.id,
      details: JSON.stringify({ action: "revoked" }),
    },
  })

  return NextResponse.json({ success: true, message: "Support access revoked" })
}
