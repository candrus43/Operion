import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"
import { sendWelcomeEmail } from "@/lib/email"
import { applyRateLimit } from "@/lib/rate-limit"

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "") // remove apostrophes
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .slice(0, 60) // keep it reasonable
}

export async function POST(req: Request) {
  // Rate limit: 5 requests per minute per IP
  const limit = await applyRateLimit(req, { maxRequests: 5, windowMs: 60_000 })
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
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    // Use provided organization name, or fall back to user name
    const orgName = organizationName?.trim() || `${name}'s Organization`

    // Create a unique organization for this user
    const baseSlug = slugify(orgName) || "my-org"
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
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        subscriptionStatus: "TRIAL",
      },
    })

    const passwordHash = await hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "OWNER",
        organizationId: org.id,
      },
    })

    // ── Seed sample data for trial ──────────────────────────────────
    try {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)

      // Entities
      const [entity1, entity2, entity3] = await Promise.all([
        prisma.entity.create({
          data: { name: "Main Street Holdings LLC", type: "COMMERCIAL_PROPERTY", organizationId: org.id, isSample: true },
        }),
        prisma.entity.create({
          data: { name: "Blue Ocean Ventures", type: "INVESTMENT", organizationId: org.id, isSample: true },
        }),
        prisma.entity.create({
          data: { name: "Oak Partners LLC", type: "BUSINESS", organizationId: org.id, isSample: true },
        }),
      ])

      // Projects
      const [proj1, proj2, proj3, proj4] = await Promise.all([
        prisma.project.create({
          data: { name: "Q3 Property Acquisition", entityId: entity1.id, organizationId: org.id, phase: "ACQUISITION", progress: 35, startDate: now, targetDate: nextWeek, isSample: true },
        }),
        prisma.project.create({
          data: { name: "Riverside Renovation", entityId: entity1.id, organizationId: org.id, phase: "CONSTRUCTION", progress: 60, startDate: now, targetDate: nextWeek, isSample: true },
        }),
        prisma.project.create({
          data: { name: "Series A Raise", entityId: entity2.id, organizationId: org.id, phase: "DUE_DILIGENCE", progress: 20, startDate: now, targetDate: nextWeek, isSample: true },
        }),
        prisma.project.create({
          data: { name: "Client Onboarding Pipeline", entityId: entity3.id, organizationId: org.id, phase: "OPERATIONS", progress: 75, startDate: now, targetDate: nextWeek, isSample: true },
        }),
      ])

      // Tasks
      await prisma.task.createMany({
        data: [
          { title: "Review purchase agreement draft", status: "IN_PROGRESS", priority: "HIGH", dueDate: nextWeek, projectId: proj1.id, entityId: entity1.id, organizationId: org.id, isSample: true },
          { title: "Schedule property inspection", status: "TODO", priority: "MEDIUM", dueDate: tomorrow, projectId: proj1.id, entityId: entity1.id, organizationId: org.id, isSample: true },
          { title: "Finalize investor deck", status: "IN_PROGRESS", priority: "CRITICAL", dueDate: tomorrow, projectId: proj3.id, entityId: entity2.id, organizationId: org.id, isSample: true },
          { title: "Negotiate contractor bids", status: "BLOCKED", priority: "HIGH", dueDate: nextWeek, projectId: proj2.id, entityId: entity1.id, organizationId: org.id, isSample: true },
          { title: "Draft operating agreement amendment", status: "DONE", priority: "MEDIUM", dueDate: now, projectId: proj4.id, entityId: entity3.id, organizationId: org.id, isSample: true },
          { title: "Compile due diligence checklist", status: "TODO", priority: "HIGH", dueDate: nextWeek, projectId: proj3.id, entityId: entity2.id, organizationId: org.id, isSample: true },
          { title: "Update cap table for Series A", status: "IN_PROGRESS", priority: "HIGH", dueDate: nextWeek, projectId: proj3.id, entityId: entity2.id, organizationId: org.id, isSample: true },
          { title: "Book site walkthrough with GC", status: "TODO", priority: "MEDIUM", dueDate: tomorrow, projectId: proj2.id, entityId: entity1.id, organizationId: org.id, isSample: true },
        ],
      })

      // Contacts
      await prisma.contact.createMany({
        data: [
          { name: "Sarah Chen", company: "Chen & Associates", position: "Real Estate Attorney", email: "sarah@chenlaw.example.com", entityId: entity1.id, organizationId: org.id, isSample: true },
          { name: "Marcus Webb", company: "Webb CPA Group", position: "CPA", email: "marcus@webbcpa.example.com", entityId: entity2.id, organizationId: org.id, isSample: true },
          { name: "Tony Rodriguez", company: "Rodriguez Builders", position: "General Contractor", email: "tony@rodriguezbuilders.example.com", entityId: entity1.id, organizationId: org.id, isSample: true },
          { name: "Julia Park", company: "Park Advisory", position: "Business Broker", email: "julia@parkadvisory.example.com", entityId: entity3.id, organizationId: org.id, isSample: true },
        ],
      })

      // Documents
      await prisma.document.createMany({
        data: [
          { name: "Operating Agreement - Main Street Holdings", type: "CONTRACT", projectId: proj1.id, entityId: entity1.id, organizationId: org.id, isSample: true },
          { name: "Q2 Financial Statements", type: "FINANCIAL_STATEMENT", entityId: entity2.id, organizationId: org.id, isSample: true },
          { name: "Insurance Certificate", type: "INSURANCE", projectId: proj2.id, entityId: entity1.id, organizationId: org.id, isSample: true },
        ],
      })

      // Meetings
      await prisma.meeting.createMany({
        data: [
          { title: "Weekly Partner Sync", date: now, location: "Virtual", projectId: proj4.id, organizationId: org.id, isSample: true },
          { title: "Investor Update Call", date: tomorrow, location: "Virtual", projectId: proj3.id, organizationId: org.id, isSample: true },
        ],
      })
    } catch (seedErr) {
      console.error("Sample data seeding failed:", seedErr)
      // Don't block registration if seeding fails
    }

    // Send welcome email — non-blocking, won't fail registration
    sendWelcomeEmail({ email: user.email, name: user.name }).catch((err) => {
      console.error("Failed to send welcome email:", err)
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
    })
  } catch (error) {
    console.error("Registration error:", error)
    const message = process.env.NODE_ENV === "development" && error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
