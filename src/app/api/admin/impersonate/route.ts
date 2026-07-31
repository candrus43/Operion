import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const DEMO_EMAIL = "morgan@blackstonepartners.demo"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only super admin can impersonate
    if (!(session.user as any).isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: super admin only" }, { status: 403 })
    }

    // Find the demo user
    const demoUser = await prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
      },
    })

    if (!demoUser) {
      return NextResponse.json({ error: "Demo user not found" }, { status: 404 })
    }

    // Return data the client can use to call session.update()
    return NextResponse.json({
      success: true,
      impersonation: {
        isImpersonating: true,
        // Original admin info to restore later
        impersonatingOriginalUserId: session.user.id,
        impersonatingOriginalOrgId: (session.user as any).organizationId,
        impersonatingOriginalEmail: session.user.email,
        impersonatingOriginalRole: (session.user as any).role,
        impersonatingOriginalName: session.user.name,
        impersonatingOriginalIsSuperAdmin: (session.user as any).isSuperAdmin,
        // Demo user info to assume
        impersonatingDemoUserId: demoUser.id,
        impersonatingDemoEmail: demoUser.email,
        impersonatingDemoName: demoUser.name,
        impersonatingDemoRole: demoUser.role,
        impersonatingDemoOrgId: demoUser.organizationId,
      },
    })
  } catch (error) {
    console.error("Impersonate error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
