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
  const priority = searchParams.get("priority")
  const assigneeId = searchParams.get("assigneeId")
  const projectId = searchParams.get("projectId")
  const entityId = searchParams.get("entityId")
  const search = searchParams.get("search")
  const sort = searchParams.get("sort") || "dueDate"
  const order = searchParams.get("order") || "asc"

  const where: any = { organizationId: orgId }

  if (status && status !== "all") {
    where.status = status
  }
  if (priority && priority !== "all") {
    where.priority = priority
  }
  if (assigneeId) {
    where.assigneeId = assigneeId
  }
  if (projectId) {
    where.projectId = projectId
  }
  if (entityId) {
    where.entityId = entityId
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ]
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: true,
      createdBy: true,
      project: true,
      entity: true,
      dependsOn: { select: { id: true, title: true, status: true } },
      _count: { select: { dependedBy: true } },
    },
    orderBy: sort === "dueDate"
      ? [{ dueDate: { sort: "asc", nulls: "last" } }]
      : sort === "priority"
        ? [{ priority: order as any }, { dueDate: { sort: "asc", nulls: "last" } }]
        : sort === "title"
          ? [{ title: order as any }]
          : sort === "status"
            ? [{ status: order as any }]
            : [{ createdAt: "desc" }],
  })

  return NextResponse.json(tasks)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id
  const body = await req.json()

  const { title, description, status, priority, dueDate, category, projectId, entityId, assigneeId, notes, dependsOnId } = body

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      status: status || "TODO",
      priority: priority || "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : null,
      category: category || null,
      organizationId: orgId,
      projectId: projectId || null,
      entityId: entityId || null,
      assigneeId: assigneeId || null,
      createdById: userId,
      notes: notes || null,
      dependsOnId: dependsOnId || null,
    },
    include: {
      assignee: true,
      createdBy: true,
      project: true,
      entity: true,
      dependsOn: { select: { id: true, title: true, status: true } },
    },
  })

  return NextResponse.json(task, { status: 201 })
}
