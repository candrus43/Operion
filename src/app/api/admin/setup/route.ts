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
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
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

    const normalizedEmail = email.trim().toLowerCase()
    const passwordHash = await hash(password, 12)
    const orgName = organizationName?.trim() || "Operion Admin"
    const baseSlug = slugify(orgName) || "operion-admin"

    // Serializable isolation makes the empty-database check and the first user
    // creation one atomic operation. Concurrent first-run requests cannot both
    // observe an empty users table and successfully commit.
    return await prisma.$transaction(async (tx) => {
      const userCount = await tx.user.count()
      if (userCount > 0) {
        return NextResponse.json(
          { error: "Admin setup is only available before the first user is created" },
          { status: 403 },
        )
      }

      let slug = baseSlug
      let suffix = 1
      while (await tx.organization.findUnique({ where: { slug } })) {
        suffix++
        slug = `${baseSlug}-${suffix}`
      }

      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug,
          subscriptionStatus: "ACTIVE",
          subscriptionTier: "TEAM",
        },
      })

      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: "OWNER",
          isSuperAdmin: true,
          organizationId: org.id,
        },
      })

      return NextResponse.json({ id: user.id, name: user.name, email: user.email })
    }, { isolationLevel: "Serializable" })
  } catch (error) {
    console.error("Admin setup error:", error)
    const message = process.env.NODE_ENV === "development" && error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
