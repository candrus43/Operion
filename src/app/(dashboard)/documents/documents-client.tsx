"use client"

import { useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  Plus,
  ExternalLink,
  Building2,
  FolderKanban,
  User,
  AlertTriangle,
  Search,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { docTypeColor, docTypeLabel } from "@/lib/colors"

const DOC_TYPES = [
  "CONTRACT", "PURCHASE_AGREEMENT", "LEASE", "INSURANCE",
  "LICENSE", "TAX", "FINANCIAL_STATEMENT", "PHOTO", "PDF", "OTHER",
] as const

// ── Consolidated type selector (Phase 4b) ────────────────────────────────────
// The audit found the type filter rendered twice (a Select + a 10-pill row).
// Here there is exactly ONE type control: the most frequent types appear as
// pills, and the remainder collapse into a single "More types" dropdown. Both
// share the same `type` query param, so only one type is ever active at a time.
const COMMON_TYPES: readonly string[] = ["CONTRACT", "PURCHASE_AGREEMENT", "LEASE", "INSURANCE"]
const MORE_TYPES = DOC_TYPES.filter((t) => !COMMON_TYPES.includes(t))

const EXPIRATION_OPTIONS: [string, string][] = [
  ["all", "Any expiry"],
  ["expiring", "Expiring within 30 days"],
  ["expired", "Expired"],
  ["none", "No expiry date"],
]

const ATTENTION_OPTIONS: [string, string][] = [
  ["all", "All docs"],
  ["needs-attention", "Needs attention"],
  ["flagged", "Flagged"],
]

interface Doc {
  id: string
  name: string
  type: string
  url?: string | null
  notes?: string | null
  content?: string | null
  createdAt?: string
  expiryDate?: string | null
  attention?: string | null
  project?: { id: string; name: string } | null
  entity?: { id: string; name: string } | null
  uploadedBy?: { id: string; name: string } | null
}

interface DocumentsClientProps {
  documents: Doc[]
  entities: { id: string; name: string }[]
  projects: { id: string; name: string }[]
  activeFilterCount: number
}

function ExpiryBadge({ iso }: { iso?: string | null }) {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  const expired = diff < 0
  const soon = diff <= 30 * 24 * 60 * 60 * 1000
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] px-1.5 py-0 mt-0.5 rounded border",
        expired
          ? "bg-red-500/10 text-red-400 border-red-500/20"
          : soon
            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
            : "text-muted-foreground/60 border-transparent",
      )}
    >
      <AlertTriangle className="h-2.5 w-2.5" />
      {expired ? "Expired " : soon ? "Expiring " : "Expires "}
      {new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
    </span>
  )
}

export function DocumentsClient({
  documents,
  entities,
  projects,
  activeFilterCount,
}: DocumentsClientProps) {
  const router = useRouter()
  const sp = useSearchParams()
  const cur = (key: string) => sp.get(key) ?? ""
  const typeFilter = cur("type")
  const searchVal = cur("search")
  const entityFilter = cur("entity")
  const projectFilter = cur("project")
  const expirationFilter = cur("expiration")
  const attentionFilter = cur("attention")

  const filtersActive =
    !!typeFilter || !!searchVal || !!entityFilter || !!projectFilter ||
    !!expirationFilter || !!attentionFilter

  // URL persistence: merge a single change into the current query string.
  // A value of "all" (or empty) means "off" and is stripped from the URL.
  const push = useCallback(
    (overrides: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString())
      for (const [k, v] of Object.entries(overrides)) {
        if (v && v !== "" && v !== "all") next.set(k, v)
        else next.delete(k)
      }
      const qs = next.toString()
      router.push(qs ? `/documents?${qs}` : "/documents")
    },
    [router, sp],
  )

  const clearAll = () => router.push("/documents")

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* ── Consolidated type selector: common pills + "more types" dropdown ── */}
        <div className="flex items-center gap-1.5 flex-wrap rounded-xl glass px-2 py-1.5">
          <button
            onClick={() => push({ type: null })}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] transition-all",
              !typeFilter ? "bg-white/15 text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>
          {COMMON_TYPES.map((t) => {
            const active = typeFilter === t
            return (
              <button
                key={t}
                onClick={() => push({ type: active ? null : t })}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] transition-all",
                  active ? "bg-white/15 text-white" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {docTypeLabel[t]}
              </button>
            )
          })}
          <Select
            value={COMMON_TYPES.includes(typeFilter) ? "all" : typeFilter || "all"}
            onValueChange={(v) => push({ type: v })}
          >
            <SelectTrigger className="h-6 w-[120px] glass border-0 text-[11px]">
              <SelectValue placeholder="More types" />
            </SelectTrigger>
            <SelectContent className="bg-white/[0.04] border border-white/[0.05]">
              <SelectItem value="all">All types</SelectItem>
              {MORE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{docTypeLabel[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchVal}
            onChange={(e) => push({ search: e.target.value })}
            className="pl-9 pr-8 glass border-0"
          />
          {searchVal && (
            <button
              onClick={() => push({ search: null })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={entityFilter || "all"} onValueChange={(v) => push({ entity: v })}>
          <SelectTrigger className="w-[150px] glass border-0 text-sm">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent className="bg-white/[0.04] border border-white/[0.05]">
            <SelectItem value="all">All Entities</SelectItem>
            {entities.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={projectFilter || "all"} onValueChange={(v) => push({ project: v })}>
          <SelectTrigger className="w-[150px] glass border-0 text-sm">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent className="bg-white/[0.04] border border-white/[0.05]">
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={expirationFilter || "all"} onValueChange={(v) => push({ expiration: v })}>
          <SelectTrigger className="w-[165px] glass border-0 text-sm">
            <SelectValue placeholder="Expiry" />
          </SelectTrigger>
          <SelectContent className="bg-white/[0.04] border border-white/[0.05]">
            {EXPIRATION_OPTIONS.map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={attentionFilter || "all"} onValueChange={(v) => push({ attention: v })}>
          <SelectTrigger className="w-[150px] glass border-0 text-sm">
            <SelectValue placeholder="Attention" />
          </SelectTrigger>
          <SelectContent className="bg-white/[0.04] border border-white/[0.05]">
            {ATTENTION_OPTIONS.map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
          </Button>
        )}
      </div>

      {/* Documents list */}
      {documents.length === 0 ? (
        <div className="card glass">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-500/10 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground/80">
              {filtersActive ? "No documents match your filters" : "No documents yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              {filtersActive
                ? "Try adjusting or clearing the filters."
                : "Upload your first document to keep everything organized."}
            </p>
            <Link href="/documents/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Document
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
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
                    className="border-b border-white/[0.03] hover:bg-white/[0.06] transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/documents/${doc.id}`} className="hover:text-white transition-colors">
                        <p className="text-sm font-medium truncate max-w-[280px]">{doc.name}</p>
                      </Link>
                      <ExpiryBadge iso={doc.expiryDate} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", docTypeColor(doc.type))}>
                        {docTypeLabel[doc.type]}
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
                        <span className="text-xs text-muted-foreground/70">—</span>
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
                        <span className="text-xs text-muted-foreground/70">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {doc.uploadedBy ? (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground/40" />
                          <span className="text-xs text-muted-foreground">{doc.uploadedBy.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/70">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {doc.createdAt
                          ? new Date(doc.createdAt).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                            })
                          : "—"}
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
