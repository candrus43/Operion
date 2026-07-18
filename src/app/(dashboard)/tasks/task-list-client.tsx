"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
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
import { Search, Calendar, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
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
}

const priorityColor = (p: string) => {
  switch (p) {
    case "CRITICAL": return "bg-red-500/10 text-red-400 border-red-500/20"
    case "HIGH": return "bg-orange-500/10 text-orange-400 border-orange-500/20"
    case "MEDIUM": return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
  }
}

const statusColor = (s: string) => {
  switch (s) {
    case "WAITING_ON": return "text-amber-400 bg-amber-500/10"
    case "BLOCKED": return "text-red-400 bg-red-500/10"
    case "IN_PROGRESS": return "text-blue-400 bg-blue-500/10"
    case "DONE": return "text-emerald-400 bg-emerald-500/10"
    case "TODO": return "text-zinc-400 bg-zinc-500/10"
    default: return "text-zinc-400 bg-zinc-500/10"
  }
}

type SortField = "title" | "status" | "priority" | "dueDate" | "createdAt"
type SortDir = "asc" | "desc"

export function TaskListClient({ tasks: initialTasks, users, entities, projects }: TaskListClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [sortField, setSortField] = useState<SortField>("dueDate")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const filteredTasks = useMemo(() => {
    let result = [...initialTasks]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q))
      )
    }

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter)
    }
    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter)
    }
    if (assigneeFilter !== "all") {
      result = result.filter((t) => t.assignee?.id === assigneeFilter)
    }

    result.sort((a, b) => {
      let cmp = 0
      if (sortField === "title") {
        cmp = a.title.localeCompare(b.title)
      } else if (sortField === "status") {
        cmp = a.status.localeCompare(b.status)
      } else if (sortField === "priority") {
        const pOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
        cmp = (pOrder[a.priority as keyof typeof pOrder] || 4) - (pOrder[b.priority as keyof typeof pOrder] || 4)
      } else if (sortField === "dueDate") {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
        cmp = aDate - bDate
      } else if (sortField === "createdAt") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return result
  }, [initialTasks, search, statusFilter, priorityFilter, assigneeFilter, sortField, sortDir])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
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

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#111111] border-0"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] bg-[#111111] border-0 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="TODO">To Do</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
            <SelectItem value="BLOCKED">Blocked</SelectItem>
            <SelectItem value="WAITING_ON">Waiting On</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] bg-[#111111] border-0 text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-[130px] bg-[#111111] border-0 text-sm">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
            <SelectItem value="all">All Assignees</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table - Desktop */}
      <div className="hidden md:block rounded-xl bg-[#111111] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
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
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground">
                    <p className="text-sm">No tasks found</p>
                    <p className="text-xs mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors group"
                  >
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.preventDefault(); cycleStatus(task) }}
                          className="h-4 w-4 shrink-0 rounded-full border-2 border-zinc-600 hover:border-emerald-400 hover:bg-emerald-400/20 transition-colors cursor-pointer"
                          title="Cycle status"
                        />
                        <Link href={`/tasks/${task.id}`} className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block group-hover:text-white transition-colors">
                            {task.title}
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
                        <Link href={`/tasks/${task.id}`} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </Link>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColor(task.status))}>
                        {task.status.replace("_", " ")}
                      </Badge>
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
                          <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                            {task.assignee.name.split(" ")[0]}
                          </span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground/40">—</span>}
                    </td>
                    <td className="p-3">
                      {task.project ? (
                        <span className="text-xs text-muted-foreground truncate block max-w-[100px]">
                          {task.project.name}
                        </span>
                      ) : <span className="text-xs text-muted-foreground/40">—</span>}
                    </td>
                    <td className="p-3">
                      {task.entity ? (
                        <span className="text-xs text-muted-foreground truncate block max-w-[100px]">
                          {task.entity.name}
                        </span>
                      ) : <span className="text-xs text-muted-foreground/40">—</span>}
                    </td>
                    <td className="p-3 pr-4">
                      {task.dueDate ? (
                        <div className={cn(
                          "flex items-center gap-1 text-xs",
                          isOverdue(task.dueDate) ? "text-red-400" : "text-muted-foreground"
                        )}>
                          <Calendar className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {isOverdue(task.dueDate) && <span className="text-[10px]">Overdue</span>}
                        </div>
                      ) : <span className="text-xs text-muted-foreground/40">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card list - Mobile */}
      <div className="md:hidden space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">No tasks found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="block rounded-xl bg-[#111111] hover:bg-[#141414] transition-colors p-4 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.preventDefault(); cycleStatus(task) }}
                      className="h-4 w-4 shrink-0 rounded-full border-2 border-zinc-600 hover:border-emerald-400 transition-colors cursor-pointer"
                    />
                    <p className="text-sm font-medium truncate group-hover:text-white transition-colors">{task.title}</p>
                    {task.dependsOn && <span className="text-[10px] text-amber-400/60 shrink-0">🔗</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColor(task.status))}>
                      {task.status.replace("_", " ")}
                    </Badge>
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
                      isOverdue(task.dueDate) ? "text-red-400" : "text-muted-foreground"
                    )}>
                      <Calendar className="h-2.5 w-2.5" />
                      {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground/50">
                {task.project && <span>{task.project.name}</span>}
                {task.project && task.entity && <span>·</span>}
                {task.entity && <span>{task.entity.name}</span>}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
