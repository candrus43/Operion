import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const { searchParams } = new URL(req.url)

  const status = searchParams.get("status")
  const phase = searchParams.get("phase")
  const entityId = searchParams.get("entityId")

  const where: any = { organizationId: orgId }

  if (status && status !== "all") {
    where.status = status
  }
  if (phase && phase !== "all") {
    where.phase = phase
  }
  if (entityId) {
    where.entityId = entityId
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      entity: true,
      _count: { select: { tasks: true, documents: true, meetings: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(projects)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await req.json()

  const { name, description, status, phase, budget, startDate, targetDate, entityId } = body

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const project = await prisma.project.create({
    data: {
      name,
      description: description || null,
      status: status || "ACTIVE",
      phase: phase || "ACQUISITION",
      progress: 0,
      budget: budget ? parseFloat(String(budget)) : null,
      startDate: startDate ? new Date(startDate) : null,
      targetDate: targetDate ? new Date(targetDate) : null,
      organizationId: orgId,
      entityId: entityId || null,
    },
    include: {
      entity: true,
      _count: { select: { tasks: true } },
    },
  })

  return NextResponse.json(project, { status: 201 })
}
