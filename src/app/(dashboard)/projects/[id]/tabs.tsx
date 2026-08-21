"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { priorityColor, statusColor, projectStatusColor, phaseColor, docTypeColor, docTypeLabel } from "@/lib/colors"
import {
  Info,
  CheckSquare,
  FileText,
  Calendar,
  Activity,
  Clock,
  DollarSign,
  Sparkles,
  ChevronRight,
  AlertTriangle,
} from "lucide-react"
import { NeedsAttentionCard } from "@/components/command-center/needs-attention-card"
import type { NeedsAttentionItem } from "@/lib/needs-attention"

type Tabs = "overview" | "tasks" | "documents" | "meetings" | "activity"

interface ProjectTabsProps {
  project: any
  needsAttention: NeedsAttentionItem[]
  activity: any[]
}

const phaseLabels: Record<string, string> = {
  ACQUISITION: "Acquisition",
  DUE_DILIGENCE: "Due Diligence",
  DESIGN: "Design",
  PERMITTING: "Permitting",
  CONSTRUCTION: "Construction",
  CLOSEOUT: "Closeout",
  OPERATIONS: "Operations",
}
// Ordered phase timeline driven by phaseLabels insertion order (Phase 3b keeps
// the `allPhases` fix from earlier so the timeline renders correctly).
const allPhases = Object.keys(phaseLabels)

const progressColor = (pct: number) => {
  if (pct >= 75) return "bg-emerald-500"
  if (pct >= 50) return "bg-blue-500"
  if (pct >= 25) return "bg-amber-500"
  return "bg-red-500"
}

const tabDefs: { key: Tabs; label: string; icon: typeof Info }[] = [
  { key: "overview", label: "Overview", icon: Info },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "meetings", label: "Meetings", icon: Calendar },
  { key: "activity", label: "Activity", icon: Activity },
]

export function ProjectTabs({ project, needsAttention, activity }: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<Tabs>("overview")
  const tasks = project.tasks || []
  const documents = project.documents || []
  const meetings = project.meetings || []
  const currentPhaseIndex = allPhases.indexOf(project.phase)

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
            {tab.key !== "overview" && (
              <span className="text-[10px] text-muted-foreground ml-1">
                {tab.key === "tasks" && tasks.length}
                {tab.key === "documents" && documents.length}
                {tab.key === "meetings" && meetings.length}
                {tab.key === "activity" && activity.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* ── Overview ─────────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {project.description && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Timeline / Phase visualization (kept from prior phase) */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Timeline &amp; Phases
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-0 overflow-x-auto pb-2">
                    {allPhases.map((phase, idx) => {
                      const isPast = idx < currentPhaseIndex
                      const isCurrent = idx === currentPhaseIndex
                      const isFuture = idx > currentPhaseIndex
                      return (
                        <div key={phase} className="flex items-center">
                          {idx > 0 && (
                            <div className={cn("h-0.5 w-6 sm:w-10", isPast || isCurrent ? "bg-white/20" : "bg-white/[0.04]")} />
                          )}
                          <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <div className={cn(
                              "w-3 h-3 rounded-full",
                              isCurrent ? "bg-emerald-500 ring-4 ring-emerald-500/20"
                                : isPast ? "bg-white/30" : "bg-white/[0.06]"
                            )} />
                            <span className={cn(
                              "text-[10px] whitespace-nowrap",
                              isCurrent ? "text-emerald-400 font-medium"
                                : isPast ? "text-muted-foreground/60" : "text-muted-foreground/70"
                            )}>
                              {phaseLabels[phase]}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Budget */}
              {project.budget && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                      Budget
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold tabular-nums">${project.budget.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">total budget</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Risk Assessment placeholder */}
              <Card className="glass border border-dashed border-white/[0.05]">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-400" />
                    AI Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 mb-3">
                      <Sparkles className="h-5 w-5 text-violet-400" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">AI-powered risk analysis</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Coming in Phase 4 — get automated risk detection and mitigation suggestions for your projects.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right rail */}
            <div className="space-y-6">
              <NeedsAttentionCard items={needsAttention} showEntity />
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Start Date</span>
                    <span className="text-xs">
                      {project.startDate ? new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Target Date</span>
                    <span className="text-xs">
                      {project.targetDate ? new Date(project.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Created</span>
                    <span className="text-xs text-muted-foreground">{new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Updated</span>
                    <span className="text-xs text-muted-foreground">{new Date(project.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <div className="pt-2 border-t border-white/[0.03]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Progress</span>
                      <span className="text-xs font-bold tabular-nums">{project.progress}%</span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.04]">
                      <div className={cn("h-full rounded-full transition-all duration-700", progressColor(project.progress))} style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── Tasks ────────────────────────────────────────────────────────── */}
        {activeTab === "tasks" && (
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] mb-4">
                  <CheckSquare className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-base font-medium">No tasks yet</p>
                <p className="text-sm text-muted-foreground mt-1">Tasks linked to this project will appear here.</p>
              </div>
            ) : (
              tasks.map((task: any) => (
                <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-start gap-3 rounded-lg glass hover:bg-white/[0.07] transition-colors p-3 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate group-hover:text-white transition-colors">{task.title}</p>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", priorityColor(task.priority))}>{task.priority}</Badge>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColor(task.status))}>{task.status.replace("_", " ")}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                      {task.assignee && <span className="text-[11px] text-muted-foreground">{task.assignee.name}</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-foreground/40 transition-colors shrink-0 mt-0.5" />
                </Link>
              ))
            )}
          </div>
        )}

        {/* ── Documents (with expiry surfacing) ─────────────────────────────── */}
        {activeTab === "documents" && (
          <div className="space-y-2">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] mb-4">
                  <FileText className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-base font-medium">No documents yet</p>
                <p className="text-sm text-muted-foreground mt-1">Documents linked to this project will appear here.</p>
              </div>
            ) : (
              documents.map((doc: any) => {
                const dc = docTypeColor(doc.type)
                const soon = doc.expiryDate && new Date(doc.expiryDate).getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000
                return (
                  <Link key={doc.id} href={`/documents/${doc.id}`} className="flex items-center gap-3 rounded-lg glass hover:bg-white/[0.07] transition-colors p-3 group">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", dc)}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-white transition-colors">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", dc)}>{docTypeLabel[doc.type] || doc.type.replace("_", " ")}</Badge>
                        {doc.expiryDate && (
                          <span className={cn("flex items-center gap-1 text-[10px] px-1.5 py-0 border rounded", soon ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "text-muted-foreground/60 border-transparent")}>
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Exp {new Date(doc.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {doc.expiryDate.getTime() < Date.now() ? " (expired)" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        )}

        {/* ── Meetings ─────────────────────────────────────────────────────── */}
        {activeTab === "meetings" && (
          <div className="space-y-2">
            {meetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] mb-4">
                  <Calendar className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-base font-medium">No meetings yet</p>
                <p className="text-sm text-muted-foreground mt-1">Meetings linked to this project will appear here.</p>
              </div>
            ) : (
              meetings.map((meeting: any) => (
                <div key={meeting.id} className="flex items-start gap-3 rounded-lg glass hover:bg-white/[0.07] transition-colors p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 shrink-0">
                    <Calendar className="h-4 w-4 text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{meeting.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(meeting.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      {meeting.location && <span className="text-[11px] text-muted-foreground">{meeting.location}</span>}
                    </div>
                    {meeting.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{meeting.notes}</p>}
                  </div>
                </div>
              ))
            )}
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
                <p className="text-sm text-muted-foreground mt-1">Changes to this project will appear here.</p>
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
