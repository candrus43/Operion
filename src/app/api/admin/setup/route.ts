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

export async function GET(req: Request) {
  const limit = await applyRateLimit(req, { maxRequests: 10, windowMs: 300_000 })
  if (limit) return limit
  // When an email is supplied, distinguish a new setup from an existing
  // account that can be upgraded through setup.
  try {
    const email = new URL(req.url).searchParams.get("email")?.trim()
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { isSuperAdmin: true },
      })
      if (user && !user.isSuperAdmin) {
        return NextResponse.json({ exists: false, needsUpgrade: true })
      }
      if (user?.isSuperAdmin) {
        return NextResponse.json({ exists: true })
      }
    }

    // Check if any super admin exists when no matching user needs upgrading.
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
    const { name, organizationName, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    const passwordHash = await hash(password, 12)

    if (existing) {
      if (existing.isSuperAdmin) {
        return NextResponse.json({ error: "Super admin already exists" }, { status: 403 })
      }

      // Setup is also the recovery path for an account created before it was
      // promoted to admin. Keep its identity, reset its credentials, and
      // attach it to an org if the old account has no organization.
      let organizationId = existing.organizationId
      if (!organizationId) {
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
        organizationId = org.id
      }

      const user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          passwordHash,
          role: "OWNER",
          isSuperAdmin: true,
          organizationId,
        },
      })

      return NextResponse.json({ id: user.id, name: user.name, email: user.email })
    }

    // Only create a new admin when no super admin exists. Existing users are
    // handled above so a stale non-admin account can be upgraded safely.
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { isSuperAdmin: true },
      select: { id: true },
    })
    if (existingSuperAdmin) {
      return NextResponse.json({ error: "Super admin already exists" }, { status: 403 })
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

    return NextResponse.json({ id: user.id, name: user.name, email: user.email })
  } catch (error) {
    console.error("Admin setup error:", error)
    const message = process.env.NODE_ENV === "development" && error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
