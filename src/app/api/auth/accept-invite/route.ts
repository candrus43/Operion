import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

// GET: Validate an invite token
export async function GET(req: NextRequest) {
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.json({ valid: false, reason: "missing" }, { status: 400 })
  }

  try {
    const user = await prisma.user.findFirst({
      where: { inviteToken: token, status: "PENDING" },
      select: { id: true, name: true, email: true, organization: { select: { name: true } } },
    })

    if (!user) {
      return NextResponse.json({ valid: false, reason: "invalid" }, { status: 200 })
    }

    return NextResponse.json({
      valid: true,
      name: user.name,
      email: user.email,
      orgName: user.organization?.name || "the organization",
    })
  } catch (error) {
    console.error("[accept-invite GET]", error)
    return NextResponse.json({ valid: false, reason: "error" }, { status: 500 })
  }
}

// POST: Accept an invite — set name, password, activate account
export async function POST(req: NextRequest) {
  const limit = await applyRateLimit(req, { maxRequests: 10, windowMs: 60_000 })
  if (limit) return limit

  try {
    const body = await req.json()
    const { token, name, password } = body

    if (!token || !name || !password) {
      return NextResponse.json({ error: "Token, name, and password are required" }, { status: 400 })
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    // Find user by invite token
    const user = await prisma.user.findFirst({
      where: { inviteToken: token, status: "PENDING" },
      select: { id: true, organizationId: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired invitation token" }, { status: 400 })
    }

    // Hash password and activate account
    const passwordHash = await hash(password, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name.trim(),
        passwordHash,
        status: "ACTIVE",
        inviteToken: null,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "UPDATE",
        entity: "User",
        entityId: user.id,
        details: JSON.stringify({ action: "accepted_invitation", status: "ACTIVE" }),
      },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[accept-invite POST]", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
