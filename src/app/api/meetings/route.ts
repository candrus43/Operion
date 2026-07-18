import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId

  const meetings = await prisma.meeting.findMany({
    where: { organizationId: orgId },
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  })

  return NextResponse.json(meetings)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await req.json()

  const { title, date, location, projectId, notes } = body

  if (!title || !date) {
    return NextResponse.json({ error: "Title and date are required" }, { status: 400 })
  }

  const meeting = await prisma.meeting.create({
    data: {
      title,
      date: new Date(date),
      location: location || null,
      organizationId: orgId,
      projectId: projectId || null,
      notes: notes || null,
    },
    include: {
      project: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(meeting, { status: 201 })
}
