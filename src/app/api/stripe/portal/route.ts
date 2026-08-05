import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getStripe } from "@/lib/stripe"
import { applyRateLimit } from "@/lib/rate-limit"

export async function POST(request: Request) {
  const limit = await applyRateLimit(request, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orgId = (session.user as any).organizationId
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 })
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { stripeCustomerId: true },
    })

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    if (!org.stripeCustomerId) {
      return NextResponse.json(
        { error: "No subscription found. Please subscribe first." },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000"

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${origin}/settings`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    console.error("Portal session error:", error)
    return NextResponse.json(
      { error: "Unable to complete billing request" },
      { status: 500 }
    )
  }
}
