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
  const type = searchParams.get("type")

  const where: any = { organizationId: orgId }
  if (type && type !== "all") {
    where.type = type
  }

  const documents = await prisma.document.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(documents)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id
  const body = await req.json()

  const { name, type, url, filePath, projectId, entityId } = body

  if (!name || !type) {
    return NextResponse.json({ error: "Name and type are required" }, { status: 400 })
  }

  const document = await prisma.document.create({
    data: {
      name,
      type,
      url: url || null,
      filePath: filePath || null,
      organizationId: orgId,
      projectId: projectId || null,
      entityId: entityId || null,
      uploadedById: userId,
    },
    include: {
      project: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(document, { status: 201 })
}
