"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Info,
  Activity,
  Calendar,
  Clock,
  CheckCircle2,
  Ban,
  Link2,
  Building2,
  FolderKanban,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { priorityColor, statusColor } from "@/lib/colors"
import { StatusActions } from "@/components/tasks/status-actions"
import { TaskActivity } from "@/components/tasks/task-activity"
import { AISuggestion } from "./ai-suggestion"
import { TaskDiscussion } from "./task-discussion"
import { NeedsAttentionCard } from "@/components/command-center/needs-attention-card"
import type { NeedsAttentionItem } from "@/lib/needs-attention"

type Tabs = "overview" | "activity"

interface TaskTabsProps {
  task: any
  needsAttention: NeedsAttentionItem[]
  auditActivity: any[]
}

const tabDefs: { key: Tabs; label: string; icon: typeof Info }[] = [
  { key: "overview", label: "Overview", icon: Info },
  { key: "activity", label: "Activity", icon: Activity },
]

export function TaskTabs({ task, needsAttention, auditActivity }: TaskTabsProps) {
  const [activeTab, setActiveTab] = useState<Tabs>("overview")
  const isOverdue = task.dueDate && task.dueDate < new Date() && task.status !== "DONE"

  const formatDate = (d: Date | null) => {
    if (!d) return null
    return d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })
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
            {tab.key === "activity" && (
              <span className="text-[10px] text-muted-foreground ml-1">{auditActivity.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* ── Overview ─────────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            {/* WAITING_ON / BLOCKED / READY_FOR_REVIEW callout (kept) */}
            {(task.status === "WAITING_ON" || task.status === "BLOCKED" || task.status === "READY_FOR_REVIEW") && (
              <div className={cn(
                "rounded-xl p-4 border mb-6",
                task.status === "WAITING_ON"
                  ? "bg-amber-500/5 border-amber-500/20"
                  : task.status === "READY_FOR_REVIEW"
                  ? "bg-purple-500/5 border-purple-500/20"
                  : "bg-red-500/5 border-red-500/20"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5",
                    task.status === "WAITING_ON" ? "bg-amber-500/10" : task.status === "READY_FOR_REVIEW" ? "bg-purple-500/10" : "bg-red-500/10"
                  )}>
                    {task.status === "WAITING_ON" ? (
                      <Clock className="h-4 w-4 text-amber-400" />
                    ) : task.status === "READY_FOR_REVIEW" ? (
                      <CheckCircle2 className="h-4 w-4 text-purple-400" />
                    ) : (
                      <Ban className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className={cn(
                      "text-sm font-semibold",
                      task.status === "WAITING_ON" ? "text-amber-300" : task.status === "READY_FOR_REVIEW" ? "text-purple-300" : "text-red-300"
                    )}>
                      {task.status === "WAITING_ON"
                        ? "Waiting on External Party"
                        : task.status === "READY_FOR_REVIEW"
                        ? "Ready for Review"
                        : "Task is Blocked"}
                    </p>
                    {task.notes && <p className="text-sm text-muted-foreground mt-1">{task.notes}</p>}
                    {!task.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.status === "WAITING_ON"
                          ? "This task is waiting on input, deliverables, or action from someone outside the team."
                          : task.status === "READY_FOR_REVIEW"
                          ? "The assignee has submitted this task for your review. Approve or request changes."
                          : "This task cannot proceed due to a blocker."}
                      </p>
                    )}
                    {(task.status === "BLOCKED" && (task.blockedReason || task.waitingOn)) && (
                      <p className="text-sm text-red-200/70 mt-1">
                        {task.blockedReason}
                        {task.waitingOn ? (task.blockedReason ? ` • On: ${task.waitingOn}` : `Waiting on: ${task.waitingOn}`) : ""}
                      </p>
                    )}
                    {(task.status === "WAITING_ON" && task.waitingOn) && (
                      <p className="text-sm text-amber-200/70 mt-1">Waiting on: {task.waitingOn}</p>
                    )}
                    {(task.status === "READY_FOR_REVIEW" && task.reviewer) && (
                      <p className="text-sm text-purple-200/70 mt-1">Reviewer: {task.reviewer.name}</p>
                    )}
                    {task.expectedResolutionDate && (task.status === "BLOCKED" || task.status === "WAITING_ON") && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Expected resolution: {task.expectedResolutionDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                    {/* Escalation chain (Phase 4e / GAP 14C) — the escalation owner and
                        the org user this task is waiting on, when present. */}
                    {(task.status === "BLOCKED" || task.status === "WAITING_ON") && (
                      <div className="mt-2 pt-2 border-t border-white/[0.06] flex flex-wrap items-center gap-x-4 gap-y-1">
                        {task.escalationOwner ? (
                          <span className="flex items-center gap-1.5 text-sm">
                            <span className={cn("text-[10px] px-1.5 py-0 rounded border", task.status === "BLOCKED" ? "bg-red-500/10 text-red-300 border-red-500/20" : "bg-amber-500/10 text-amber-300 border-amber-500/20")}>
                              ESCALATED
                            </span>
                            <span className={cn("text-sm font-medium", task.status === "BLOCKED" ? "text-red-200/90" : "text-amber-200/90")}>
                              {task.escalationOwner}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No escalation owner set</span>
                        )}
                        {task.waitingOnUser && (
                          <span className={cn(
                            "flex items-center gap-1.5 text-sm",
                            task.status === "WAITING_ON" ? "text-amber-200/90" : "text-red-200/90"
                          )}>
                            <Avatar className="h-4 w-4">
                              <AvatarFallback className="text-[8px] bg-[#222]">
                                {task.waitingOnUser.name.split(" ").map((n: string) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            Waiting on: {task.waitingOnUser.name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main content */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {task.description ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground/50 italic">No description provided.</p>
                    )}
                  </CardContent>
                </Card>

                {task.dependsOn && (
                  <Card className="glass">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-amber-400" />
                        Dependency
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 rounded-lg bg-white/[0.04] p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Blocked by:</p>
                          <Link href={`/tasks/${task.dependsOn.id}`} className="text-sm font-medium hover:text-white transition-colors">
                            {task.dependsOn.title}
                          </Link>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColor(task.dependsOn.status))}>
                          {task.dependsOn.status.replace("_", " ")}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {task.dependedBy.length > 0 && (
                  <Card className="glass">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-blue-400" />
                        Blocking ({task.dependedBy.length})
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">These tasks depend on this one being completed</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {task.dependedBy.map((dep: any) => (
                        <Link key={dep.id} href={`/tasks/${dep.id}`} className="flex items-center gap-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] p-3 transition-colors group">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate group-hover:text-white transition-colors">{dep.title}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColor(dep.status))}>
                                {dep.status.replace("_", " ")}
                              </Badge>
                              {dep.priority === "CRITICAL" && (
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priorityColor(dep.priority))}>
                                  {dep.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-foreground/40 transition-colors" />
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {task.notes && (
                  <Card className="glass">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
                    </CardContent>
                  </Card>
                )}

                <AISuggestion
                  taskId={task.id}
                  existingSuggestion={task.aiSuggestion}
                  generatedAt={task.aiSuggestionGeneratedAt ? task.aiSuggestionGeneratedAt.toISOString() : null}
                />

                <TaskDiscussion taskId={task.id} />
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <NeedsAttentionCard items={needsAttention} />

                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Assignee</span>
                      {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[9px] bg-[#222]">
                              {task.assignee.name.split(" ").map((n: string) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{task.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Created by</span>
                      {task.createdBy ? <span className="text-xs">{task.createdBy.name}</span> : <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Project</span>
                      {task.project ? (
                        <Link href={`/projects/${task.project.id}`} className="text-xs hover:text-white transition-colors flex items-center gap-1">
                          <FolderKanban className="h-3 w-3" />
                          {task.project.name}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Entity</span>
                      {task.entity ? (
                        <Link href={`/entities/${task.entity.id}`} className="text-xs hover:text-white transition-colors flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {task.entity.name}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Due Date</span>
                      {task.dueDate ? (
                        <div className={cn("flex items-center gap-1 text-xs", isOverdue ? "text-red-400" : "")}>
                          <Calendar className="h-3 w-3" />
                          {formatDate(task.dueDate)}
                          {isOverdue && <span className="text-[10px] ml-1">OVERDUE</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.03]">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColor(task.status))}>
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Created</span>
                      <span className="text-xs text-muted-foreground">{task.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Updated</span>
                      <span className="text-xs text-muted-foreground">{task.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StatusActions taskId={task.id} currentStatus={task.status} assigneeId={task.assigneeId} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* ── Activity ─────────────────────────────────────────────────────── */}
        {activeTab === "activity" && (
          <div className="space-y-6">
            {/* Phase 1d task-events activity feed (kept) */}
            <TaskActivity taskId={task.id} />
            {/* Audit log activity for the record */}
            <div>
              <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Audit Log <span className="text-[10px] text-muted-foreground">{auditActivity.length}</span>
              </h3>
              {auditActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground/60 py-6 text-center">No audit entries yet.</p>
              ) : (
                <div className="space-y-2">
                  {auditActivity.map((a: any) => (
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
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
