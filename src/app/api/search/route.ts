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
  const q = searchParams.get("q")

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ results: [] })
  }

  const query = q.trim()

  const [tasks, projects, entities, documents, contacts] = await Promise.all([
    prisma.task.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ],
      },
      select: { id: true, title: true, description: true, status: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
      },
      select: { id: true, name: true, description: true, status: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.entity.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { name: { contains: query } },
        ],
      },
      select: { id: true, name: true, type: true },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.document.findMany({
      where: {
        organizationId: orgId,
        name: { contains: query },
      },
      select: { id: true, name: true, type: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { name: { contains: query } },
          { company: { contains: query } },
          { email: { contains: query } },
        ],
      },
      select: { id: true, name: true, company: true },
      take: 5,
      orderBy: { name: "asc" },
    }),
  ])

  const results = {
    tasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      subtitle: t.status.replace("_", " "),
      type: "task" as const,
      link: `/tasks/${t.id}`,
    })),
    projects: projects.map(p => ({
      id: p.id,
      title: p.name,
      subtitle: p.status.replace("_", " "),
      type: "project" as const,
      link: `/projects/${p.id}`,
    })),
    entities: entities.map(e => ({
      id: e.id,
      title: e.name,
      subtitle: e.type.replace(/_/g, " "),
      type: "entity" as const,
      link: `/entities/${e.id}`,
    })),
    documents: documents.map(d => ({
      id: d.id,
      title: d.name,
      subtitle: d.type.replace(/_/g, " "),
      type: "document" as const,
      link: `/documents`,
    })),
    contacts: contacts.map(c => ({
      id: c.id,
      title: c.name,
      subtitle: c.company || "Contact",
      type: "contact" as const,
      link: `/contacts`,
    })),
  }

  return NextResponse.json({ results, query: q })
}
