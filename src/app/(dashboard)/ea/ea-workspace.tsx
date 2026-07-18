"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  ListTodo,
  ArrowRight,
  Plus,
  ExternalLink,
  ClipboardList,
  User,
  RefreshCw,
  StickyNote,
} from "lucide-react"
import { format } from "date-fns"

const priorityColors: Record<string, string> = {
  CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
  HIGH: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  MEDIUM: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  LOW: "bg-slate-500/10 text-slate-400 border-slate-500/20",
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase ${priorityColors[priority] || priorityColors.MEDIUM}`}>
      {priority}
    </span>
  )
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  category: string | null
  notes: string | null
  project?: { id: string; name: string } | null
  entity?: { id: string; name: string } | null
  assignee?: { id: string; name: string } | null
}

interface Meeting {
  id: string
  title: string
  date: string
  location: string | null
  project?: { id: string; name: string } | null
}

interface User {
  id: string
  name: string
  role: string
  email: string
}

interface Project {
  id: string
  name: string
}

export function EAWorkspace({
  userId,
  orgId,
  dailyTasks,
  pendingApprovals,
  upcomingMeetings,
  completedTasks,
  users,
  projects,
  userRole,
}: {
  userId: string
  orgId: string
  dailyTasks: Task[]
  pendingApprovals: Task[]
  upcomingMeetings: Meeting[]
  completedTasks: Task[]
  users: User[]
  projects: Project[]
  userRole: string
}) {
  const router = useRouter()
  const [notes, setNotes] = useState("")
  const [taskList, setTaskList] = useState(dailyTasks)
  const [completingId, setCompletingId] = useState<string | null>(null)

  // New follow-up task form
  const [newTitle, setNewTitle] = useState("")
  const [newProjectId, setNewProjectId] = useState("")
  const [newAssigneeId, setNewAssigneeId] = useState("")
  const [creatingFollowUp, setCreatingFollowUp] = useState(false)

  // Load notes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ea-notes")
    if (saved) setNotes(saved)
  }, [])

  const saveNotes = (value: string) => {
    setNotes(value)
    localStorage.setItem("ea-notes", value)
  }

  // Complete toggle
  const handleComplete = async (taskId: string) => {
    setCompletingId(taskId)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DONE" }),
      })
      if (res.ok) {
        setTaskList((prev) => prev.filter((t) => t.id !== taskId))
        toast.success("Task marked complete")
      } else {
        toast.error("Failed to update task")
      }
    } catch {
      toast.error("Failed to update task")
    } finally {
      setCompletingId(null)
    }
  }

  // Create follow-up task
  const handleCreateFollowUp = async () => {
    if (!newTitle) return
    setCreatingFollowUp(true)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          status: "TODO",
          priority: "MEDIUM",
          projectId: newProjectId || null,
          assigneeId: newAssigneeId || userId,
        }),
      })
      if (res.ok) {
        toast.success("Follow-up task created")
        setNewTitle("")
        setNewProjectId("")
        setNewAssigneeId("")
      } else {
        toast.error("Failed to create task")
      }
    } catch {
      toast.error("Failed to create task")
    } finally {
      setCreatingFollowUp(false)
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return ""
    const date = new Date(d)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (date.toDateString() === today.toDateString()) return "Today"
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow"
    return format(date, "MMM d")
  }

  const isPastDue = (dateStr: string | null) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date(new Date().toDateString())
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">EA Workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">Your command center for daily operations</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => router.refresh()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Section 1: Daily Task Queue */}
      <Card className="bg-[#111111] border-white/[0.04]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4 text-violet-400" />
            Daily Task Queue
            <Badge variant="secondary" className="ml-2 text-[10px]">{taskList.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {taskList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400/40 mb-3" />
              <p className="text-sm text-muted-foreground">All caught up! No pending tasks.</p>
              <Button variant="link" size="sm" className="mt-1" onClick={() => router.push("/tasks/new")}>
                <Plus className="h-3 w-3 mr-1" /> Create a task
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {taskList.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors group"
                >
                  <button
                    onClick={() => handleComplete(task.id)}
                    disabled={completingId === task.id}
                    className="shrink-0 h-5 w-5 rounded-full border-2 border-muted-foreground/30 hover:border-emerald-400 hover:bg-emerald-400/10 transition-colors flex items-center justify-center"
                  >
                    {completingId === task.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-emerald-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/tasks/${task.id}`}
                        className="text-sm font-medium truncate hover:underline hover:text-white transition-colors"
                      >
                        {task.title}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <PriorityBadge priority={task.priority} />
                      {task.project && (
                        <span className="text-[11px] text-muted-foreground">{task.project.name}</span>
                      )}
                      {task.dueDate && (
                        <span className={`text-[11px] ${isPastDue(task.dueDate) ? "text-red-400" : "text-muted-foreground"}`}>
                          <Clock className="h-3 w-3 inline mr-0.5" />
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={() => router.push(`/tasks/${task.id}`)}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Pending Approvals */}
      <Card className="bg-[#111111] border-white/[0.04]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            Pending Approvals
            <Badge variant="secondary" className="ml-2 text-[10px]">{pendingApprovals.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {pendingApprovals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nothing waiting for approval</p>
            </div>
          ) : (
            <div className="space-y-1">
              {pendingApprovals.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="shrink-0 h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={`/tasks/${task.id}`}
                      className="text-sm font-medium truncate hover:underline hover:text-white transition-colors block"
                    >
                      {task.title}
                    </a>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.assignee && (
                        <span className="text-[11px] text-muted-foreground">
                          <User className="h-3 w-3 inline mr-0.5" />
                          {task.assignee.name}
                        </span>
                      )}
                      {task.notes && (
                        <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                          — {task.notes}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => router.push(`/tasks/${task.id}`)}
                  >
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3 + 4: Calendar + Follow-ups side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calendar Management */}
        <Card className="bg-[#111111] border-white/[0.04]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-sky-400" />
              Next 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No meetings this week</p>
                <Button variant="link" size="sm" className="mt-1" onClick={() => router.push("/meetings/new")}>
                  <Plus className="h-3 w-3 mr-1" /> Schedule Meeting
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="shrink-0 w-12 text-center">
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(meeting.date), "EEE")}
                      </div>
                      <div className="text-lg font-semibold">
                        {format(new Date(meeting.date), "d")}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{meeting.title}</div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{format(new Date(meeting.date), "h:mm a")}</span>
                        {meeting.location && <span>— {meeting.location}</span>}
                        {meeting.project && <span>— {meeting.project.name}</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => router.push(`/meetings/${meeting.id}/edit`)}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => router.push("/meetings/new")}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Schedule Meeting
            </Button>
          </CardContent>
        </Card>

        {/* Follow-Up Tracker */}
        <Card className="bg-[#111111] border-white/[0.04]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4 text-emerald-400" />
              Follow-Up Tracker
              <Badge variant="secondary" className="ml-2 text-[10px]">{completedTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {completedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No tasks completed this week</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-[#1a1a1a] transition-colors text-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="flex-1 truncate text-muted-foreground">{task.title}</span>
                    <span className="text-[11px] text-muted-foreground/60 shrink-0">
                      {formatDate(task.dueDate)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {/* Quick follow-up creation */}
            <div className="mt-3 space-y-2 border-t border-white/[0.04] pt-3">
              <p className="text-xs text-muted-foreground">Quick follow-up task</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Task title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-8 text-xs bg-[#1a1a1a] border-white/[0.06]"
                />
                <Button
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  disabled={!newTitle || creatingFollowUp}
                  onClick={handleCreateFollowUp}
                >
                  {creatingFollowUp ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Add"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Select value={newProjectId} onValueChange={setNewProjectId}>
                  <SelectTrigger className="h-7 text-xs bg-[#1a1a1a] border-white/[0.06]">
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newAssigneeId} onValueChange={setNewAssigneeId}>
                  <SelectTrigger className="h-7 text-xs bg-[#1a1a1a] border-white/[0.06]">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No assignee</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 5: Executive Notes */}
      <Card className="bg-[#111111] border-white/[0.04]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <StickyNote className="h-4 w-4 text-rose-400" />
            Executive Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Textarea
            placeholder="Write quick notes, reminders, or things to discuss with the executive..."
            value={notes}
            onChange={(e) => saveNotes(e.target.value)}
            className="min-h-[120px] bg-[#1a1a1a] border-white/[0.06] text-sm resize-y"
          />
          <p className="text-[11px] text-muted-foreground/50 mt-2">
            Notes are stored locally in your browser. {notes.length > 0 && `${notes.length} characters`}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
