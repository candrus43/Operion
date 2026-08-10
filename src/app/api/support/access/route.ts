import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

/**
 * GET /api/support/access?token=xxx
 * Validates a support access token and returns the target organization info.
 * The client-side page at /support/access passes only the opaque token to the
 * server-side JWT callback, which derives all support claims from the record.
 * Rate-limited to 5 requests per minute per IP to prevent brute-force.
 */
export async function GET(request: Request) {
  const limit = await applyRateLimit(request, { maxRequests: 5, windowMs: 60_000 })
  if (limit) return limit

  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (!token || typeof token !== "string" || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 })
  }

  // Look up the token
  const supportToken = await prisma.supportAccessToken.findUnique({
    where: { token },
    include: {
      organization: {
        select: { name: true },
      },
    },
  })

  if (!supportToken) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 })
  }

  // Check if revoked
  if (supportToken.revokedAt) {
    return NextResponse.json({
      error: "This support access has been revoked by the account owner.",
      reason: "revoked",
    }, { status: 403 })
  }

  // Check if expired
  if (new Date() > supportToken.expiresAt) {
    return NextResponse.json({
      error: "This support access link has expired.",
      reason: "expired",
    }, { status: 403 })
  }

  // Token is valid — return display information only. Authorization claims are
  // intentionally not returned for client-side session injection; the JWT callback
  // validates the opaque token and derives those claims server-side.
  return NextResponse.json({
    valid: true,
    orgName: supportToken.organization.name,
  })
}
