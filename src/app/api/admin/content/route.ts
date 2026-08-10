import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function superAdminGuard(session: any) {
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user as any).isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return null
}

// POST — create a new post
export async function POST(req: NextRequest) {
  const session = await auth()
  const guard = superAdminGuard(session)
  if (guard) return guard

  let body: {
    title: string
    body: string
    status?: string
    scheduledDate?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.title?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: "Title and body are required" }, { status: 400 })
  }

  const post = await prisma.contentPost.create({
    data: {
      title: body.title.trim(),
      body: body.body.trim(),
      status: body.status || "DRAFT",
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
      publishedDate: body.status === "PUBLISHED" ? new Date() : null,
    },
  })

  return NextResponse.json(post)
}

// PATCH — update post status
export async function PATCH(req: NextRequest) {
  const session = await auth()
  const guard = superAdminGuard(session)
  if (guard) return guard

  let body: {
    id: string
    status?: string
    scheduledDate?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const data: any = {}
  if (body.status) {
    data.status = body.status
    if (body.status === "PUBLISHED") {
      data.publishedDate = new Date()
    }
  }
  if (body.scheduledDate !== undefined) {
    data.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null
  }

  const post = await prisma.contentPost.update({
    where: { id: body.id },
    data,
  })

  return NextResponse.json(post)
}

// DELETE — delete a post
export async function DELETE(req: NextRequest) {
  const session = await auth()
  const guard = superAdminGuard(session)
  if (guard) return guard

  const id = req.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "id query param required" }, { status: 400 })
  }

  await prisma.contentPost.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

// GET — list posts (optional, for direct API consumers)
export async function GET() {
  const session = await auth()
  const guard = superAdminGuard(session)
  if (guard) return guard

  const posts = await prisma.contentPost.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(posts)
}
