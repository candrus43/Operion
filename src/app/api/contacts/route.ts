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
  const entityId = searchParams.get("entityId")
  const search = searchParams.get("search")

  const where: any = { organizationId: orgId }
  if (entityId && entityId !== "all") {
    where.entityId = entityId
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { company: { contains: search } },
      { email: { contains: search } },
    ]
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      entity: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(contacts)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const body = await req.json()

  const { name, company, position, phone, email, entityId, notes } = body

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const contact = await prisma.contact.create({
    data: {
      name,
      company: company || null,
      position: position || null,
      phone: phone || null,
      email: email || null,
      organizationId: orgId,
      entityId: entityId || null,
      notes: notes || null,
    },
    include: {
      entity: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(contact, { status: 201 })
}
