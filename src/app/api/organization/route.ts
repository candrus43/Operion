import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId

  if (!orgId) {
    return NextResponse.json({ name: "Operion" })
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  })

  return NextResponse.json({ name: org?.name || "Operion" })
}
