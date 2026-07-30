import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * GET /api/support/sessions
 * Customer lists all support access tokens (active and past) for their organization.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 })
  }

  const tokens = await prisma.supportAccessToken.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      permissions: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      createdBy: true,
      token: false, // Never expose the raw token in listings
    },
    take: 50,
  })

  // Enrich with status
  const sessions = tokens.map((t) => {
    let status: "active" | "expired" | "revoked"
    if (t.revokedAt) {
      status = "revoked"
    } else if (new Date() > t.expiresAt) {
      status = "expired"
    } else {
      status = "active"
    }

    return {
      id: t.id,
      permissions: t.permissions,
      expiresAt: t.expiresAt.toISOString(),
      revokedAt: t.revokedAt?.toISOString() || null,
      createdAt: t.createdAt.toISOString(),
      createdBy: t.createdBy,
      status,
    }
  })

  return NextResponse.json({ sessions })
}
