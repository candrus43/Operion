import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { docTypeColor, docTypeLabel } from "@/lib/colors"
import { AskAiButton } from "@/components/ai/ask-ai-button"
import { ArrowLeft, Pencil } from "lucide-react"
import { DocumentDeleteButton } from "./delete-button"
import { DocumentTabs } from "./tabs"
import { collectDocumentNeedsAttention } from "@/lib/needs-attention"


export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const orgId = (session.user as any).organizationId

  const document = await prisma.document.findFirst({
    where: { id, organizationId: orgId },
    include: {
      project: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  })

  if (!document) notFound()

  const [needsAttention, activity] = await Promise.all([
    collectDocumentNeedsAttention(orgId, document.id),
    prisma.auditLog.findMany({
      where: { organizationId: orgId, entity: "Document", entityId: document.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/documents">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{document.name}</h1>
            <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 border", docTypeColor(document.type))}>
              {docTypeLabel[document.type]}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AskAiButton type="document" id={document.id} title={document.name} />
          <Link href={`/documents/${document.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <DocumentDeleteButton documentId={document.id} documentName={document.name} />
        </div>
      </div>

      {/* Command center tabs */}
      <DocumentTabs document={document} needsAttention={needsAttention} activity={activity} />
    </div>
  )
}
