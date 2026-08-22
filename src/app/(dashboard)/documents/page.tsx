import { PageHeader } from "@/components/layout/page-header"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Prisma } from "@prisma/client"
import { DocumentsClient } from "./documents-client"

export const dynamic = "force-dynamic"

/** Documents whose expiry is within this many days count as "expiring soon". */
export const EXPIRING_DAYS = 30
const HOUR = 60 * 60 * 1000

/**
 * Date/expiration range filter. Mirrors the task `due` builder so the filter
 * feels native: expiring (within 30 days), expired, no-expiry, or all.
 */
function buildExpirationWhere(exp: string): Prisma.DocumentWhereInput {
  const now = new Date()
  switch (exp) {
    case "expiring":
      return { expiryDate: { gte: now, lte: new Date(now.getTime() + EXPIRING_DAYS * 24 * HOUR) } }
    case "expired":
      return { expiryDate: { lt: now } }
    case "none":
      return { expiryDate: null }
    default:
      return {}
  }
}

/**
 * Attention-status filter. "needs-attention" = expired OR expiring within 30
 * days OR the operator set an explicit attention flag (RENEW/REVIEW/FLAGGED).
 * "flagged" = only documents with an explicit attention flag.
 */
function buildAttentionWhere(att: string): Prisma.DocumentWhereInput {
  const now = new Date()
  switch (att) {
    case "needs-attention":
      return {
        OR: [
          { expiryDate: { lt: new Date(now.getTime() + EXPIRING_DAYS * 24 * HOUR) } },
          { attention: { not: null } },
        ],
      }
    case "flagged":
      return { attention: { not: null } }
    default:
      return {}
  }
}

export default async function DocumentsPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const orgId = (session.user as any).organizationId
  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No organization found.</p>
      </div>
    )
  }

  const params = await props.searchParams

  // ── Parse the combinable filters from the URL ─────────────────────────────
  const type = params.type && params.type !== "all" ? params.type : undefined
  const search = params.search?.trim() || undefined
  const entity = params.entity && params.entity !== "all" ? params.entity : undefined
  const project = params.project && params.project !== "all" ? params.project : undefined
  const expiration = params.expiration && params.expiration !== "all" ? params.expiration : undefined
  const attention = params.attention && params.attention !== "all" ? params.attention : undefined

  // ── Compose the single query: org scope AND'ed with each active filter ──
  const filterFragments: Prisma.DocumentWhereInput[] = []
  if (type) filterFragments.push({ type })
  if (entity) filterFragments.push({ entityId: entity })
  if (project) filterFragments.push({ projectId: project })
  if (expiration) filterFragments.push(buildExpirationWhere(expiration))
  if (attention) filterFragments.push(buildAttentionWhere(attention))
  if (search) {
    filterFragments.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ],
    })
  }

  const where: Prisma.DocumentWhereInput = { AND: [{ organizationId: orgId }, ...filterFragments] }

  const [documents, entities, projects] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.entity.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Library"
        title="Documents"
        description={`${documents.length} document${documents.length !== 1 ? "s" : ""}`}
        actions={
          <Link href="/documents/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Document
            </Button>
          </Link>
        }
      />

      <DocumentsClient
        documents={JSON.parse(JSON.stringify(documents))}
        entities={entities}
        projects={projects}
        activeFilterCount={filterFragments.length}
      />
    </div>
  )
}
