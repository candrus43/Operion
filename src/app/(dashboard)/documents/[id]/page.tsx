import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Pencil,
  Trash2,
  ExternalLink,
  FileText,
  Building2,
  FolderKanban,
  User,
  Calendar,
  Download,
} from "lucide-react"
import { DocumentDeleteButton } from "./delete-button"

const typeColors: Record<string, string> = {
  CONTRACT: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  PURCHASE_AGREEMENT: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  LEASE: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  INSURANCE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  LICENSE: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  TAX: "bg-red-500/10 text-red-400 border-red-500/20",
  FINANCIAL_STATEMENT: "bg-green-500/10 text-green-400 border-green-500/20",
  PHOTO: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  PDF: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  OTHER: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
}

const typeLabels: Record<string, string> = {
  CONTRACT: "Contract",
  PURCHASE_AGREEMENT: "Purchase Agreement",
  LEASE: "Lease",
  INSURANCE: "Insurance",
  LICENSE: "License",
  TAX: "Tax",
  FINANCIAL_STATEMENT: "Financial Statement",
  PHOTO: "Photo",
  PDF: "PDF",
  OTHER: "Other",
}

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
            <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 border", typeColors[document.type])}>
              {typeLabels[document.type]}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/documents/${document.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <DocumentDeleteButton documentId={document.id} documentName={document.name} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* View Document */}
          <Card className="border-0 bg-[#111111]">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Document</CardTitle>
            </CardHeader>
            <CardContent>
              {document.filePath ? (
                <div className="space-y-3">
                  <a
                    href={document.filePath}
                    download
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1a1a1a] hover:bg-[#1e1e1e] px-4 py-3 text-sm transition-colors"
                  >
                    <Download className="h-4 w-4 text-sky-400" />
                    <span>Download File</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{document.name}</span>
                  </a>
                  {document.url && (
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#1a1a1a] hover:bg-[#1e1e1e] px-4 py-3 text-sm transition-colors ml-3"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <span>External Link</span>
                    </a>
                  )}
                </div>
              ) : document.url ? (
                <a
                  href={document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1a1a1a] hover:bg-[#1e1e1e] px-4 py-3 text-sm transition-colors"
                >
                  <ExternalLink className="h-4 w-4 text-sky-400" />
                  <span>View Document</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">{document.url}</span>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-500/10 mb-3">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground/80">No file uploaded</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Edit this document to upload a file or add an external URL.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — Metadata */}
        <div className="space-y-4">
          <Card className="border-0 bg-[#111111]">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Type */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Type</span>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", typeColors[document.type])}>
                  {typeLabels[document.type]}
                </Badge>
              </div>

              {/* Project */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Project</span>
                {document.project ? (
                  <Link href={`/projects/${document.project.id}`} className="text-xs hover:text-white transition-colors flex items-center gap-1">
                    <FolderKanban className="h-3 w-3" />
                    {document.project.name}
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground/50">—</span>
                )}
              </div>

              {/* Entity */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Entity</span>
                {document.entity ? (
                  <Link href={`/entities/${document.entity.id}`} className="text-xs hover:text-white transition-colors flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {document.entity.name}
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground/50">—</span>
                )}
              </div>

              {/* Uploaded by */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Uploaded by</span>
                {document.uploadedBy ? (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-muted-foreground/40" />
                    <span className="text-xs">{document.uploadedBy.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/50">—</span>
                )}
              </div>

              {/* Created */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.03]">
                <span className="text-xs text-muted-foreground">Created</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {document.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>

              {/* Updated */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Updated</span>
                <span className="text-xs text-muted-foreground">
                  {document.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
