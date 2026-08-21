import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { ContactDeleteButton } from "./delete-button"
import { AskAiButton } from "@/components/ai/ask-ai-button"
import { ContactTabs } from "./tabs"
import { collectNeedsAttention } from "@/lib/needs-attention"

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const orgId = (session.user as any).organizationId

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: orgId },
    include: {
      entity: { select: { id: true, name: true } },
      relations: {
        include: { entity: { select: { id: true, name: true, type: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!contact) notFound()

  // Every distinct entity this person relates to (relations + fallback entityId
  // for rows not yet migrated to relations).
  const relations = contact.relations
  const entityIds = [
    ...new Set([
      ...relations.map((r) => r.entityId),
      ...(contact.entityId ? [contact.entityId] : []),
    ]),
  ]
  const entityRefs = entityIds.map((eid) => {
    const r = relations.find((x) => x.entityId === eid)
    const named = r?.entity?.name
    // Fallback name from the primary entity relation
    const primName = contact.entity?.id === eid ? contact.entity.name : undefined
    return { id: eid, name: named ?? primName }
  })

  const [needsAttention, tasks, projects, documents, activity, entitiesMap] = await Promise.all([
    collectNeedsAttention(orgId, entityRefs, { includeProjects: true }),
    entityIds.length
      ? prisma.task.findMany({
          where: { organizationId: orgId, entityId: { in: entityIds } },
          include: { assignee: true, project: { select: { id: true, name: true } }, entity: { select: { id: true, name: true } } },
          orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
        })
      : [],
    entityIds.length
      ? prisma.project.findMany({
          where: { organizationId: orgId, entityId: { in: entityIds } },
          orderBy: { updatedAt: "desc" },
        })
      : [],
    entityIds.length
      ? prisma.document.findMany({
          where: { organizationId: orgId, entityId: { in: entityIds } },
          orderBy: { createdAt: "desc" },
        })
      : [],
    prisma.auditLog.findMany({
      where: { organizationId: orgId, entity: "Contact", entityId: contact.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    entityIds.length
      ? prisma.entity.findMany({ where: { id: { in: entityIds } }, select: { id: true, name: true } })
      : [],
  ])
  const entityNameById: Record<string, string> = Object.fromEntries(entitiesMap.map((e) => [e.id, e.name]))

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/contacts" className="hover:text-foreground transition-colors">
          Contacts
        </Link>
        <span>/</span>
        <span className="text-foreground">{contact.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/10">
            <span className="text-base font-semibold text-sky-400">
              {contact.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{contact.name}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {contact.company && (
                <Badge variant="outline" className="text-[11px] px-2 py-0.5 border bg-blue-500/10 text-blue-400 border-blue-500/20">
                  {contact.company}
                </Badge>
              )}
              {contact.position && (
                <Badge variant="outline" className="text-[11px] px-2 py-0.5 border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                  {contact.position}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {relations.length} entit{relations.length === 1 ? "y" : "ies"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AskAiButton type="contact" id={contact.id} title={contact.name} />
          <Link href={`/contacts/${contact.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <ContactDeleteButton contactId={contact.id} contactName={contact.name} />
        </div>
      </div>

      {/* Command center tabs */}
      <ContactTabs
        contact={contact}
        entityNameById={entityNameById}
        needsAttention={needsAttention}
        tasks={tasks}
        projects={projects}
        documents={documents}
        activity={activity}
      />
    </div>
  )
}
