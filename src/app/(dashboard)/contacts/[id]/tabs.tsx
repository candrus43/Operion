"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { priorityColor, statusColor, projectStatusColor, docTypeColor, docTypeLabel } from "@/lib/colors"
import {
  Info,
  Network,
  FolderKanban,
  CheckSquare,
  FileText,
  Mail,
  Phone,
  Briefcase,
  Building2,
  StickyNote,
  Activity,
  Calendar,
  ChevronRight,
} from "lucide-react"
import { NeedsAttentionCard } from "@/components/command-center/needs-attention-card"
import type { NeedsAttentionItem } from "@/lib/needs-attention"

type Tabs = "overview" | "relationships" | "related" | "activity"

interface ContactTabsProps {
  contact: any
  entityNameById: Record<string, string>
  needsAttention: NeedsAttentionItem[]
  tasks: any[]
  projects: any[]
  documents: any[]
  activity: any[]
}

const tabDefs: { key: Tabs; label: string; icon: typeof Info }[] = [
  { key: "overview", label: "Overview", icon: Info },
  { key: "relationships", label: "Relationships", icon: Network },
  { key: "related", label: "Related Items", icon: FolderKanban },
  { key: "activity", label: "Activity", icon: Activity },
]

export function ContactTabs({
  contact,
  entityNameById,
  needsAttention,
  tasks,
  projects,
  documents,
  activity,
}: ContactTabsProps) {
  const [activeTab, setActiveTab] = useState<Tabs>("overview")
  const relations = contact.relations || []

  const staticRelations = relations.map((r: any) => ({
    id: r.entity.id,
    name: r.entity.name,
    role: r.role,
    notes: r.notes,
    enabled: r.enabled,
  }))
  // include the primary entityId even if not in relations (pre-migration)
  if (contact.entityId && !staticRelations.some((r: any) => r.id === contact.entityId) && contact.entity) {
    staticRelations.push({
      id: contact.entityId,
      name: contact.entity.name,
      role: contact.position,
      notes: null,
      enabled: true,
    })
  }

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
            {tab.key === "relationships" && (
              <span className="text-[10px] text-muted-foreground ml-1">{staticRelations.length}</span>
            )}
            {tab.key === "related" && (
              <span className="text-[10px] text-muted-foreground ml-1">{tasks.length + projects.length + documents.length}</span>
            )}
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
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {contact.email && (
                      <div className="flex items-center gap-3 rounded-lg bg-white/[0.04] p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 shrink-0">
                          <Mail className="h-4 w-4 text-sky-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">Email</p>
                          <a href={`mailto:${contact.email}`} className="text-sm hover:text-white truncate block transition-colors">
                            {contact.email}
                          </a>
                        </div>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-3 rounded-lg bg-white/[0.04] p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
                          <Phone className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">Phone</p>
                          <a href={`tel:${contact.phone}`} className="text-sm hover:text-white truncate block transition-colors">
                            {contact.phone}
                          </a>
                        </div>
                      </div>
                    )}
                    {contact.company && (
                      <div className="flex items-center gap-3 rounded-lg bg-white/[0.04] p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 shrink-0">
                          <Building2 className="h-4 w-4 text-violet-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">Company</p>
                          <p className="text-sm truncate">{contact.company}</p>
                        </div>
                      </div>
                    )}
                    {contact.position && (
                      <div className="flex items-center gap-3 rounded-lg bg-white/[0.04] p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
                          <Briefcase className="h-4 w-4 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">Position</p>
                          <p className="text-sm truncate">{contact.position}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {!contact.email && !contact.phone && !contact.company && !contact.position && (
                    <p className="text-sm text-muted-foreground/50 italic text-center py-4">No contact information provided.</p>
                  )}
                </CardContent>
              </Card>

              {contact.notes && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-amber-400" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <NeedsAttentionCard items={needsAttention} showEntity />
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Created</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(contact.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Updated</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(contact.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── Relationships ────────────────────────────────────────────────── */}
        {activeTab === "relationships" && (
          <div className="space-y-3">
            {staticRelations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] mb-4">
                  <Network className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-base font-medium">No entity relationships</p>
                <p className="text-sm text-muted-foreground mt-1">Link this contact to entities to show their roles.</p>
              </div>
            ) : (
              staticRelations.map((r: any) => (
                <Link key={r.id} href={`/entities/${r.id}`} className="block">
                  <Card className="glass hover:bg-white/[0.07] transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-white transition-colors">{r.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {r.role && <span className="text-[11px] text-muted-foreground truncate">{r.role}</span>}
                              {!r.enabled && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/20 shrink-0 mt-2" />
                      </div>
                      {r.notes && (
                        <p className="text-xs text-muted-foreground/70 mt-2.5 pt-2.5 border-t border-white/[0.03]">{r.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        )}

        {/* ── Related Items ────────────────────────────────────────────────── */}
        {activeTab === "related" && (
          <div className="space-y-6">
            {/* Tasks scoped to the contact's entities */}
            <div>
              <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                <CheckSquare className="h-4 w-4 text-violet-400" />
                Tasks <span className="text-[10px] text-muted-foreground">{tasks.length}</span>
              </h3>
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60 py-6 text-center">No related tasks.</p>
                ) : (
                  tasks.map((task: any) => (
                    <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-start gap-3 rounded-lg glass hover:bg-white/[0.07] p-3 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate group-hover:text-white transition-colors">{task.title}</p>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", priorityColor(task.priority))}>{task.priority}</Badge>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColor(task.status))}>{task.status.replace("_", " ")}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground/60">
                          <span>{task.entity?.name || entityNameById[task.entityId] || ""}</span>
                          {task.project && <span>· {task.project.name}</span>}
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Projects */}
            <div>
              <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                <FolderKanban className="h-4 w-4 text-emerald-400" />
                Projects <span className="text-[10px] text-muted-foreground">{projects.length}</span>
              </h3>
              <div className="space-y-2">
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60 py-6 text-center">No related projects.</p>
                ) : (
                  projects.map((p: any) => (
                    <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 rounded-lg glass hover:bg-white/[0.07] p-3 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-white transition-colors">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground/60">{p.entity?.name || entityNameById[p.entityId] || ""}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", projectStatusColor(p.status))}>{p.status.replace("_", " ")}</Badge>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Documents */}
            <div>
              <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-sky-400" />
                Documents <span className="text-[10px] text-muted-foreground">{documents.length}</span>
              </h3>
              <div className="space-y-2">
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60 py-6 text-center">No related documents.</p>
                ) : (
                  documents.map((doc: any) => (
                    <Link key={doc.id} href={`/documents/${doc.id}`} className="flex items-center gap-3 rounded-lg glass hover:bg-white/[0.07] p-3 transition-colors group">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", docTypeColor(doc.type))}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-white transition-colors">{doc.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", docTypeColor(doc.type))}>{docTypeLabel[doc.type] || doc.type.replace("_", " ")}</Badge>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
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
                <p className="text-sm text-muted-foreground mt-1">Changes to this contact will appear here.</p>
              </div>
            ) : (
              activity.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg glass p-3">
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 mt-0.5 shrink-0", a.action === "CREATE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : a.action === "DELETE" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20")}>
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
