"use client"

import { useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  User,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { priorityColor, statusColor } from "@/lib/colors"
import { TASK_VIEWS, type TaskViewId } from "@/lib/task-views"
import { toast } from "sonner"

type Task = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  category: string | null
  assignee: { id: string; name: string; image: string | null } | null
  project: { id: string; name: string } | null
  entity: { id: string; name: string } | null
  dependsOn: { id: string; title: string; status: string } | null
  notes: string | null
  createdAt: string
}

type User = { id: string; name: string }
type Entity = { id: string; name: string }
type Project = { id: string; name: string }

interface TaskListClientProps {
  tasks: Task[]
  users: User[]
  entities: Entity[]
  projects: Project[]
  currentUserId?: string
  view: TaskViewId
  viewLabel: string
  counts: Record<TaskViewId, number>
  activeFilterCount: number
}

const priorityDot = (p: string) => {
  switch (p) {
    case "CRITICAL": return "bg-red-400 shadow-[0_0_9px_rgba(239,68,68,0.7)]"
    case "HIGH": return "bg-orange-400 shadow-[0_0_9px_rgba(249,115,22,0.6)]"
    case "MEDIUM": return "bg-blue-400 shadow-[0_0_9px_rgba(59,130,246,0.6)]"
    default: return "bg-slate-400"
  }
}

type SortField = "title" | "status" | "priority" | "dueDate" | "createdAt"
type SortDir = "asc" | "desc"

const STATUS_OPTIONS = [
  ["TODO", "To Do"],
  ["IN_PROGRESS", "In Progress"],
  ["DONE", "Done"],
  ["BLOCKED", "Blocked"],
  ["WAITING_ON", "Waiting On"],
  ["READY_FOR_REVIEW", "Ready for Review"],
] as const

const PRIORITY_OPTIONS = [
  ["CRITICAL", "Critical"],
  ["HIGH", "High"],
  ["MEDIUM", "Medium"],
  ["LOW", "Low"],
] as const

const DUE_OPTIONS = [
  ["overdue", "Overdue"],
  ["next7", "Next 7 days"],
  ["next30", "Next 30 days"],
  ["none", "No due date"],
] as const

export function TaskListClient({
  tasks: initialTasks,
  users,
  entities,
  projects,
  currentUserId,
  view,
  counts,
  activeFilterCount,
}: TaskListClientProps) {
  const router = useRouter()
  const sp = useSearchParams()

  const cur = (key: string) => sp.get(key) ?? ""
  const statusFilter = cur("status")
  const priorityFilter = cur("priority")
  const assigneeFilter = cur("assignee")
  const entityFilter = cur("entity")
  const projectFilter = cur("project")
  const dueFilter = cur("due")
  const searchVal = cur("search")
  const sortField = (cur("sort") || "dueDate") as SortField
  const sortDir: SortDir = cur("sortDir") === "desc" ? "desc" : "asc"

  // URL persistence: merge a single change into the current query string.
  // NB: `view` is special — its `all` value is the real "All Tasks" view, so it
  // must never be stripped; the `all` semantics only apply to filter params.
  const push = useCallback(
    (overrides: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString())
      for (const [k, v] of Object.entries(overrides)) {
        if (v && v !== "" && (k === "view" || v !== "all")) next.set(k, v)
        else next.delete(k)
      }
      const qs = next.toString()
      router.push(qs ? `/tasks?${qs}` : "/tasks")
    },
    [router, sp],
  )

  // Resolve sort semantics; toggling the same column flips direction.
  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      push({ sort: field, sortDir: sortDir === "asc" ? null : "asc" })
    } else {
      push({ sort: field, sortDir: "asc" })
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />
  }

  const cycleStatus = async (task: Task) => {
    const order = ["TODO", "IN_PROGRESS", "DONE"]
    const current = order.indexOf(task.status)
    const next = order[(current + 1) % order.length]
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success(`Status → ${next.replace("_", " ")}`)
      router.refresh()
    } catch {
      toast.error("Failed to update status")
    }
  }

  const statusSummary = [
    ["BLOCKED", "Blocked", "text-rose-300 bg-rose-400/10 border-rose-400/15"],
    ["IN_PROGRESS", "In Progress", "text-sky-300 bg-sky-400/10 border-sky-400/15"],
    ["DONE", "Done", "text-emerald-300 bg-emerald-400/10 border-emerald-400/15"],
  ] as const

  const hasActiveFilters =
    !!statusFilter || !!priorityFilter || !!assigneeFilter || !!entityFilter || !!projectFilter || !!dueFilter || !!searchVal
  const filtersActive = hasActiveFilters

  const clearAll = () =>
    push({
      status: null,
      priority: null,
      assignee: null,
      entity: null,
      project: null,
      due: null,
      search: null,
    })

  const onMyTasksShortcut = () => push({ view: view === "my-tasks" ? "all" : "my-tasks" })

  return (
    <div className="space-y-4">
      {/* Saved views row — pills with live counts, active state obvious */}
      <div className="flex flex-wrap items-center gap-2">
        {TASK_VIEWS.map((v) => {
          const active = v.id === view
          return (
            <button
              key={v.id}
              onClick={() => push({ view: v.id })}
              title={v.description}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all",
                active
                  ? "border-white/20 bg-white/[0.09] text-white shadow-sm"
                  : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
              )}
            >
              {v.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] tabular-nums",
                  active ? "bg-white/15 text-white" : "bg-white/[0.06] text-muted-foreground",
                )}
              >
                {counts[v.id] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* Status summary */}
      <div className="flex flex-wrap items-center gap-2">
        {statusSummary.map(([status, label, style]) => {
          const active = statusFilter === status
          return (
            <button
              key={status}
              onClick={() => push({ status: active ? null : status })}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] transition-all",
                style,
                active && "ring-1 ring-white/25",
              )}
            >
              {initialTasks.filter((t) => t.status === status).length} {label}
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
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

        <Select value={statusFilter || "all"} onValueChange={(v) => push({ status: v })}>
          <SelectTrigger className="w-[130px] glass border-0 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-white/[0.04] border border-white/[0.05]">
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={priorityFilter || "all"} onValueChange={(v) => push({ priority: v })}>
          <SelectTrigger className="w-[130px] glass border-0 text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-white/[0.04] border border-white/[0.05]">
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITY_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={assigneeFilter || "all"} onValueChange={(v) => push({ assignee: v })}>
          <SelectTrigger className="w-[130px] glass border-0 text-sm">
            <SelectValue placeholder="Owner / Assignee" />
          </SelectTrigger>
          <SelectContent className="bg-white/[0.04] border border-white/[0.05]">
            <SelectItem value="all">All Assignees</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityFilter || "all"} onValueChange={(v) => push({ entity: v })}>
          <SelectTrigger className="w-[130px] glass border-0 text-sm">
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
          <SelectTrigger className="w-[130px] glass border-0 text-sm">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent className="bg-white/[0.04] border border-white/[0.05]">
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dueFilter || "all"} onValueChange={(v) => push({ due: v })}>
          <SelectTrigger className="w-[120px] glass border-0 text-sm">
            <SelectValue placeholder="Due date" />
          </SelectTrigger>
          <SelectContent className="bg-white/[0.04] border border-white/[0.05]">
            <SelectItem value="all">Any due date</SelectItem>
            {DUE_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>

        {currentUserId && (
          <Button
            variant={view === "my-tasks" ? "default" : "outline"}
            size="sm"
            className={`gap-1.5 text-xs ${
              view === "my-tasks" ? "" : "glass border-0 text-muted-foreground hover:text-foreground"
            }`}
            onClick={onMyTasksShortcut}
          >
            <User className="h-3 w-3" />
            My Tasks
          </Button>
        )}

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

      {/* Table - Desktop */}
      <div className="hidden md:block rounded-xl glass overflow-hidden">
        <div className="max-h-[min(70vh,720px)] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-[#101014]/95 backdrop-blur-xl">
              <tr className="border-b border-white/[0.05] text-xs text-muted-foreground">
                <th className="text-left p-3 pl-4 w-[40%]">
                  <button onClick={() => toggleSort("title")} className="flex items-center gap-1 hover:text-foreground transition-colors font-medium">
                    Title <SortIcon field="title" />
                  </button>
                </th>
                <th className="text-left p-3 w-[10%]">
                  <button onClick={() => toggleSort("status")} className="flex items-center gap-1 hover:text-foreground transition-colors font-medium">
                    Status <SortIcon field="status" />
                  </button>
                </th>
                <th className="text-left p-3 w-[10%]">
                  <button onClick={() => toggleSort("priority")} className="flex items-center gap-1 hover:text-foreground transition-colors font-medium">
                    Priority <SortIcon field="priority" />
                  </button>
                </th>
                <th className="text-left p-3 w-[12%]">Assignee</th>
                <th className="text-left p-3 w-[12%]">Project</th>
                <th className="text-left p-3 w-[10%]">Entity</th>
                <th className="text-left p-3 pr-4 w-[10%]">
                  <button onClick={() => toggleSort("dueDate")} className="flex items-center gap-1 hover:text-foreground transition-colors font-medium">
                    Due <SortIcon field="dueDate" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {initialTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground">
                    <p className="text-sm">No tasks in this view.</p>
                    <p className="text-xs mt-1">Try changing the view or clearing filters.</p>
                  </td>
                </tr>
              ) : (
                initialTasks.map((task) => {
                  const overdue = !!task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE"
                  const blocked = task.status === "BLOCKED" || task.dependsOn?.status === "BLOCKED"
                  const accent = overdue
                    ? "border-l-rose-400/60 bg-rose-500/[0.035]"
                    : blocked
                      ? "border-l-amber-400/50 bg-amber-500/[0.02]"
                      : ""
                  return (
                    <tr
                      key={task.id}
                      className={cn(
                        "border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors group border-l-2 border-l-transparent",
                        accent,
                      )}
                    >
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.preventDefault(); cycleStatus(task) }}
                            className="h-4 w-4 shrink-0 rounded-full border-2 border-zinc-600 hover:border-emerald-400 hover:bg-emerald-400/20 transition-colors cursor-pointer"
                            title="Cycle status"
                          />
                          <Link href={`/tasks/${task.id}`} className="flex-1 min-w-0">
                            <span className="flex items-center gap-2 text-sm font-medium truncate group-hover:text-white transition-colors" title={task.title}>
                              <span className={cn("h-2 w-2 shrink-0 rounded-full", priorityDot(task.priority))} aria-label={`${task.priority} priority`} />
                              <span className="truncate">{task.title}</span>
                            </span>
                            {task.category && (
                              <span className="text-[10px] text-muted-foreground/50">{task.category}</span>
                            )}
                          </Link>
                          {task.dependsOn && (
                            <span className="text-[10px] text-amber-400/60 shrink-0" title={`Blocked by: ${task.dependsOn.title}`}>
                              🔗
                            </span>
                          )}
                          <Link href={`/tasks/${task.id}`} className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity">
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </Link>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColor(task.status))}>
                            {task.status.replace("_", " ")}
                          </Badge>
                          {blocked && task.status !== "BLOCKED" && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-400/20">blocked ↑</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", priorityColor(task.priority))}>
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {task.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[9px] bg-[#222]">
                                {task.assignee.name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate max-w-[80px]" title={task.assignee.name}>
                              {task.assignee.name.split(" ")[0]}
                            </span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground/40">—</span>}
                      </td>
                      <td className="p-3">
                        {task.project ? (
                          <span className="text-xs text-muted-foreground truncate block max-w-[110px]" title={task.project.name}>
                            {task.project.name}
                          </span>
                        ) : <span className="text-xs text-muted-foreground/40">—</span>}
                      </td>
                      <td className="p-3">
                        {task.entity ? (
                          <span className="text-xs text-muted-foreground truncate block max-w-[110px]" title={task.entity.name}>
                            {task.entity.name}
                          </span>
                        ) : <span className="text-xs text-muted-foreground/40">—</span>}
                      </td>
                      <td className="p-3 pr-4">
                        {task.dueDate ? (
                          <div className={cn(
                            "flex items-center gap-1.5 text-xs",
                            overdue ? "text-red-400" : "text-muted-foreground",
                          )}>
                            <Calendar className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {overdue && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-400/20">Overdue</span>
                            )}
                          </div>
                        ) : <span className="text-xs text-muted-foreground/40">—</span>}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card list - Mobile */}
      <div className="md:hidden space-y-3">
        {initialTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">No tasks in this view.</p>
            <p className="text-xs text-muted-foreground mt-1">Try changing the view or clearing filters.</p>
          </div>
        ) : (
          initialTasks.map((task) => {
            const overdue = !!task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE"
            const blocked = task.status === "BLOCKED" || task.dependsOn?.status === "BLOCKED"
            const accent = overdue
              ? "border-l-rose-400/60 bg-rose-500/[0.035]"
              : blocked
                ? "border-l-amber-400/50 bg-amber-500/[0.02]"
                : ""
            return (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className={cn("block rounded-xl glass hover:bg-white/[0.07] transition-colors p-4 group border-l-2 border-l-transparent", accent)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.preventDefault(); cycleStatus(task) }}
                        className="h-4 w-4 shrink-0 rounded-full border-2 border-zinc-600 hover:border-emerald-400 transition-colors cursor-pointer"
                      />
                      <p className="flex items-center gap-2 text-sm font-medium truncate group-hover:text-white transition-colors" title={task.title}>
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", priorityDot(task.priority))} />{task.title}
                      </p>
                      {task.dependsOn && <span className="text-[10px] text-amber-400/60 shrink-0">🔗</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColor(task.status))}>
                        {task.status.replace("_", " ")}
                      </Badge>
                      {blocked && task.status !== "BLOCKED" && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-400/20">blocked ↑</span>
                      )}
                      {overdue && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-400/20">Overdue</span>
                      )}
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", priorityColor(task.priority))}>
                        {task.priority}
                      </Badge>
                      {task.category && (
                        <span className="text-[10px] text-muted-foreground/50">{task.category}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {task.assignee && (
                      <Avatar className="h-6 w-6 ml-auto mb-1">
                        <AvatarFallback className="text-[9px] bg-[#222]">
                          {task.assignee.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {task.dueDate && (
                      <div className={cn(
                        "flex items-center gap-1 text-[10px]",
                        overdue ? "text-red-400" : "text-muted-foreground",
                      )}>
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground/50">
                  {task.project && <span className="truncate" title={task.project.name}>{task.project.name}</span>}
                  {task.project && task.entity && <span>·</span>}
                  {task.entity && <span className="truncate" title={task.entity.name}>{task.entity.name}</span>}
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
