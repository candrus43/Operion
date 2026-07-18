import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileText, Plus, ExternalLink, Building2, FolderKanban, User } from "lucide-react"
import { cn } from "@/lib/utils"

const DOC_TYPES = [
  "CONTRACT", "PURCHASE_AGREEMENT", "LEASE", "INSURANCE",
  "LICENSE", "TAX", "FINANCIAL_STATEMENT", "PHOTO", "PDF", "OTHER"
] as const

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

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const orgId = (session.user as any).organizationId
  const sp = await searchParams
  const typeFilter = sp.type || "all"

  const where: any = { organizationId: orgId }
  if (typeFilter !== "all") {
    where.type = typeFilter
  }

  const documents = await prisma.document.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {documents.length} document{documents.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/documents/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Document
          </Button>
        </Link>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filter by type:</span>
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px] bg-[#111111] border-0">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
            <SelectItem value="all">All Types</SelectItem>
            {DOC_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Client-side filter using search params */}
        <Link href={`/documents?type=all`}>
          <Button variant="ghost" size="sm" className={cn("text-xs", typeFilter === "all" && "bg-[#1a1a1a]")}>
            All
          </Button>
        </Link>
        {DOC_TYPES.map((t) => (
          <Link key={t} href={`/documents?type=${t}`}>
            <Button
              variant="ghost"
              size="sm"
              className={cn("text-xs", typeFilter === t && "bg-[#1a1a1a]")}
            >
              {typeLabels[t]}
            </Button>
          </Link>
        ))}
      </div>

      {/* Documents list */}
      {documents.length === 0 ? (
        <Card className="border-0 bg-[#111111]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-500/10 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground/80">No documents yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Upload your first document to keep everything organized.
            </p>
            <Link href="/documents/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Document
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border-0 bg-[#111111] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Project</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Entity</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Uploaded by</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-white/[0.03] hover:bg-[#1a1a1a] transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/documents/${doc.id}`} className="hover:text-white transition-colors">
                        <p className="text-sm font-medium truncate max-w-[280px]">{doc.name}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", typeColors[doc.type])}>
                        {typeLabels[doc.type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {doc.project ? (
                        <Link
                          href={`/projects/${doc.project.id}`}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
                        >
                          <FolderKanban className="h-3 w-3" />
                          {doc.project.name}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {doc.entity ? (
                        <Link
                          href={`/entities/${doc.entity.id}`}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
                        >
                          <Building2 className="h-3 w-3" />
                          {doc.entity.name}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {doc.uploadedBy ? (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground/40" />
                          <span className="text-xs text-muted-foreground">{doc.uploadedBy.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {doc.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
