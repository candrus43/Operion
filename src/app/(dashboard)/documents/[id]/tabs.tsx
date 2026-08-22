"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { docTypeColor, docTypeLabel } from "@/lib/colors"
import {
  Info,
  Activity,
  FileText,
  Building2,
  FolderKanban,
  User,
  Calendar,
  Download,
  ExternalLink,
  AlertTriangle,
  ShieldAlert,
  StickyNote,
  CheckCircle2,
} from "lucide-react"
import { NeedsAttentionCard } from "@/components/command-center/needs-attention-card"
import type { NeedsAttentionItem } from "@/lib/needs-attention"
import { AiConversation } from "@/components/ai/ai-conversation"
import { Sparkles, FileCheck2 } from "lucide-react"

type Tabs = "overview" | "intelligence" | "activity"

interface DocumentTabsProps {
  document: any
  needsAttention: NeedsAttentionItem[]
  activity: any[]
}

const tabDefs: { key: Tabs; label: string; icon: typeof Info }[] = [
  { key: "overview", label: "Overview", icon: Info },
  { key: "intelligence", label: "Intelligence", icon: ShieldAlert },
  { key: "activity", label: "Activity", icon: Activity },
]

// Derived intelligence status (mirrors the server-side needs-attention reason for
// display only; the briefing itself is computed by collectDocumentNeedsAttention).
function intelligenceStatus(doc: any): { label: string; cls: string } | null {
  const now = Date.now()
  const flagged = doc.attention && doc.attention.trim().length > 0
  if (doc.expiryDate) {
    const t = new Date(doc.expiryDate).getTime()
    if (t < now) return { label: "Expired", cls: "bg-red-500/10 text-red-400 border-red-500/20" }
    if (t - now <= 30 * 24 * 60 * 60 * 1000) return { label: "Expiring soon", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" }
  }
  if (flagged) return { label: "Needs attention", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" }
  if (doc.expiryDate) return { label: "Valid", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
  return null
}

export function DocumentTabs({ document, needsAttention, activity }: DocumentTabsProps) {
  const [activeTab, setActiveTab] = useState<Tabs>("overview")
  const intelligence = intelligenceStatus(document)
  const daysToExpiry = document.expiryDate
    ? Math.ceil((new Date(document.expiryDate).getTime() - Date.now()) / 86_400_000)
    : null
  const hasFullText = Boolean(document.content && document.content.trim().length > 0)

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-white/[0.05] pb-0 mb-6 overflow-x-auto">
        {tabDefs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
              activeTab === tab.key
                ? "text-white border-b-2 border-white -mb-[1px]"
                : "text-muted-foreground hover:text-foreground/70"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.key === "activity" && (
              <span className="text-[10px] text-muted-foreground ml-1">{activity.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* ── Overview ─────────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main: view document */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Document</CardTitle>
                </CardHeader>
                <CardContent>
                  {document.filePath ? (
                    <div className="space-y-3">
                      <a href={document.filePath} download className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] px-4 py-3 text-sm transition-colors">
                        <Download className="h-4 w-4 text-sky-400" />
                        <span>Download File</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{document.name}</span>
                      </a>
                      {document.url && (
                        <a href={document.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] px-4 py-3 text-sm transition-colors ml-3">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          <span>External Link</span>
                        </a>
                      )}
                    </div>
                  ) : document.url ? (
                    <a href={document.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] px-4 py-3 text-sm transition-colors">
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
                      <p className="text-xs text-muted-foreground mt-1">Edit this document to upload a file or add an external URL.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {document.notes && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-amber-400" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{document.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <NeedsAttentionCard items={needsAttention} />

              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Type</span>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", docTypeColor(document.type))}>
                      {docTypeLabel[document.type]}
                    </Badge>
                  </div>

                  {document.expiryDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Expiry</span>
                      <span className={cn("text-xs flex items-center gap-1", intelligence?.label === "Expired" ? "text-red-400" : intelligence?.label === "Expiring soon" ? "text-amber-300" : "text-muted-foreground")}>
                        <Calendar className="h-3 w-3" />
                        {new Date(document.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Project</span>
                    {document.project ? (
                      <Link href={`/projects/${document.project.id}`} className="text-xs hover:text-white transition-colors flex items-center gap-1">
                        <FolderKanban className="h-3 w-3" />
                        {document.project.name}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Entity</span>
                    {document.entity ? (
                      <Link href={`/entities/${document.entity.id}`} className="text-xs hover:text-white transition-colors flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {document.entity.name}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Uploaded by</span>
                    {document.uploadedBy ? (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground/40" />
                        <span className="text-xs">{document.uploadedBy.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.03]">
                    <span className="text-xs text-muted-foreground">Created</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {document.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>

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
        )}

        {/* ── Intelligence ─────────────────────────────────────────────────── */}
        {activeTab === "intelligence" && (
          <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  Expiry &amp; Attention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  {intelligence ? (
                    <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5", intelligence.cls)}>
                      {intelligence.label}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      No watch set
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Expiry Date</span>
                  <span className="text-xs">
                    {document.expiryDate
                      ? new Date(document.expiryDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                      : "Not set"}
                  </span>
                </div>
                {daysToExpiry !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Days to expiry</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full border",
                      daysToExpiry < 0 ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : daysToExpiry <= 30 ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    )}>
                      {daysToExpiry < 0 ? `${-daysToExpiry} days past` : `${daysToExpiry} day${daysToExpiry === 1 ? "" : "s"}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Full text on file</span>
                  <span className={cn("text-xs flex items-center gap-1.5", hasFullText ? "text-emerald-400" : "text-muted-foreground/60")}>
                    {hasFullText ? (
                      <>
                        <FileCheck2 className="h-3.5 w-3.5" />
                        {document.content.trim().length.toLocaleString()} chars — Q&amp;A can read it
                      </>
                    ) : (
                      <span>Metadata only — AI answers honestly without it</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Attention</span>
                  <span className="text-xs">{document.attention ? document.attention : "None"}</span>
                </div>
                {document.expiryNote && (
                  <div className="rounded-lg bg-white/[0.04] p-3">
                    <p className="text-[11px] text-muted-foreground mb-1">Expiry note</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{document.expiryNote}</p>
                  </div>
                )}
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-3 text-[11px] text-muted-foreground leading-relaxed">
                  Set an expiry date and/or attention flag while editing this document. Health is derived
                  automatically: documents expiring within 30 days surface as <span className="text-amber-300">Expiring soon</span>,
                  past-due ones as <span className="text-red-400">Expired</span>, and any explicit attention flag as{" "}
                  <span className="text-blue-400">Needs attention</span> — each appears in the project/entity briefings too.
                </div>
                <Link href={`/documents/${document.id}/edit`}>
                  <span className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors">
                    <AlertTriangle className="h-3 w-3" />
                    Edit intelligence settings
                  </span>
                </Link>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Briefing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <NeedsAttentionCard items={needsAttention} />
              </CardContent>
            </Card>
          </div>

          {/* ── Document Q&A (Phase 4c) ─────────────────────────────────── */}
          <Card className="glass mt-6">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                Ask about this document
              </CardTitle>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Answers are grounded in {hasFullText ? "this document's stored full text and its metadata" : "this document's metadata"}{" "}
                with clickable sources. {hasFullText ? "" : "No full text is stored, so content questions are answered honestly from metadata only."}
              </p>
            </CardHeader>
            <CardContent>
              <AiConversation
                initialContext={{ type: "document", id: document.id, title: document.name }}
                placeholder={`Ask about “${document.name}” — e.g. when does it expire? summarize it.`}
                compact
                hideContextChip
              />
            </CardContent>
          </Card>
          </>
        )}

        {/* ── Activity ─────────────────────────────────────────────────────── */}
        {activeTab === "activity" && (
          <div className="space-y-2">
            {activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] mb-4">
                  <Activity className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-base font-medium">No activity yet</p>
                <p className="text-sm text-muted-foreground mt-1">Changes to this document will appear here.</p>
              </div>
            ) : (
              activity.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg glass p-3">
                  <Badge variant="outline" className={cn(
                    "text-[10px] px-1.5 py-0 mt-0.5 shrink-0",
                    a.action === "CREATE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : a.action === "DELETE" ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                  )}>
                    {a.action}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">{a.details || a.entity}</p>
                    <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                      {new Date(a.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
