import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orgId = (session.user as any).organizationId

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: orgId },
    include: {
      entity: {
        select: {
          id: true,
          name: true,
          projects: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!contact) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(contact)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orgId = (session.user as any).organizationId
  const body = await req.json()
  const { name, company, position, phone, email, entityId, notes } = body

  const existing = await prisma.contact.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(company !== undefined && { company: company || null }),
      ...(position !== undefined && { position: position || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(email !== undefined && { email: email || null }),
      ...(entityId !== undefined && { entityId: entityId || null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
    include: {
      entity: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(contact)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orgId = (session.user as any).organizationId

  const existing = await prisma.contact.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.contact.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
