import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hash } from "bcryptjs"

export async function POST(req: NextRequest) {
  const { secret } = await req.json().catch(() => ({}))
  if (secret !== "operion-setup-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 1. Create admin if not exists
    const adminEmail = "Hello@operion.online"
    let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (!adminUser) {
      const adminOrg = await prisma.organization.create({
        data: { name: "Operion", slug: "operion" },
      })
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          name: "Admin",
          password: await hash("Admin123!", 10),
          role: "OWNER",
          organizationId: adminOrg.id,
          isSuperAdmin: true,
        },
      })
    }

    // 2. Create demo user if not exists
    const demoEmail = "morgan@blackstonepartners.demo"
    let demoUser = await prisma.user.findUnique({ where: { email: demoEmail } })
    if (!demoUser) {
      const demoOrg = await prisma.organization.create({
        data: {
          name: "Blackstone Partners LLC",
          slug: "blackstone-partners-" + Date.now(),
          subscriptionTier: "SOLO",
          subscriptionStatus: "TRIAL",
          trialStartDate: new Date(),
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      })
      demoUser = await prisma.user.create({
        data: {
          email: demoEmail,
          name: "Morgan Webb",
          password: await hash("demo123!", 10),
          role: "OWNER",
          organizationId: demoOrg.id,
        },
      })
    }

    return NextResponse.json({
      status: "ok",
      admin: adminUser.email,
      demo: demoUser.email,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
