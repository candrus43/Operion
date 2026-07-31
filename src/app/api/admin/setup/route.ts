import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

export async function GET() {
  // Check if any super admin exists
  try {
    const superAdmin = await prisma.user.findFirst({
      where: { isSuperAdmin: true },
      select: { id: true },
    })
    return NextResponse.json({ exists: !!superAdmin })
  } catch (error) {
    console.error("Admin setup check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  // Rate limit: 3 requests per 5 minutes per IP
  const limit = await applyRateLimit(req, { maxRequests: 3, windowMs: 300_000 })
  if (limit) return limit

  try {
    // Only allow setup if no super admin exists
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { isSuperAdmin: true },
    })
    if (existingSuperAdmin) {
      return NextResponse.json({ error: "Super admin already exists" }, { status: 403 })
    }

    const { name, organizationName, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const orgName = organizationName?.trim() || "Operion Admin"

    const baseSlug = slugify(orgName) || "operion-admin"
    let slug = baseSlug
    let suffix = 1
    while (await prisma.organization.findUnique({ where: { slug } })) {
      suffix++
      slug = `${baseSlug}-${suffix}`
    }

    const org = await prisma.organization.create({
      data: {
        name: orgName,
        slug,
        subscriptionStatus: "ACTIVE",
        subscriptionTier: "TEAM",
      },
    })

    const passwordHash = await hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "OWNER",
        isSuperAdmin: true,
        organizationId: org.id,
      },
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
    })
  } catch (error) {
    console.error("Admin setup error:", error)
    const message = process.env.NODE_ENV === "development" && error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
