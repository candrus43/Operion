import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId

  const [organization, entities, projects, tasks, contacts, documents] =
    await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, slug: true, createdAt: true },
      }),
      prisma.entity.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, type: true, metadata: true, createdAt: true, updatedAt: true },
      }),
      prisma.project.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, description: true, status: true, phase: true, progress: true, budget: true, startDate: true, targetDate: true, entityId: true, createdAt: true, updatedAt: true },
      }),
      prisma.task.findMany({
        where: { organizationId: orgId },
        select: { id: true, title: true, description: true, status: true, priority: true, dueDate: true, category: true, projectId: true, entityId: true, assigneeId: true, createdAt: true, updatedAt: true },
      }),
      prisma.contact.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, company: true, position: true, phone: true, email: true, entityId: true, notes: true, createdAt: true, updatedAt: true },
      }),
      prisma.document.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, type: true, projectId: true, entityId: true, createdAt: true, updatedAt: true },
      }),
    ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    organization,
    entities,
    projects,
    tasks,
    contacts,
    documents,
  }

  const json = JSON.stringify(exportData, null, 2)

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="operion-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  })
}
