"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, CheckSquare, Loader2 } from "lucide-react"
import { toast } from "sonner"

type User = { id: string; name: string }
type Entity = { id: string; name: string }
type Project = { id: string; name: string }
type TaskRef = { id: string; title: string }

interface TaskFormProps {
  users: User[]
  entities: Entity[]
  projects: Project[]
  allTasks: TaskRef[]
  task?: any
  isEdit?: boolean
}

export function TaskForm({ users, entities, projects, allTasks, task, isEdit }: TaskFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState(task?.title || "")
  const [description, setDescription] = useState(task?.description || "")
  const [status, setStatus] = useState(task?.status || "TODO")
  const [priority, setPriority] = useState(task?.priority || "MEDIUM")
  const [category, setCategory] = useState(task?.category || "")
  const [dueDate, setDueDate] = useState(task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "")
  const [projectId, setProjectId] = useState(task?.projectId || "")
  const [entityId, setEntityId] = useState(task?.entityId || "")
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId || "")
  const [dependsOnId, setDependsOnId] = useState(task?.dependsOnId || "")
  const [notes, setNotes] = useState(task?.notes || "")

  // Filter out the current task from the depends-on list (avoid circular deps + self)
  const availableDeps = isEdit
    ? allTasks.filter(t => t.id !== task?.id)
    : allTasks

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        category: category.trim() || null,
        dueDate: dueDate || null,
        projectId: projectId || null,
        entityId: entityId || null,
        assigneeId: assigneeId || null,
        dependsOnId: dependsOnId || null,
        notes: notes.trim() || null,
      }

      const url = isEdit ? `/api/tasks/${task.id}` : "/api/tasks"
      const method = isEdit ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save task")
      }

      const result = await res.json()
      toast.success(isEdit ? "Task updated" : "Task created")
      router.push(`/tasks/${result.id}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to save task")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={isEdit ? `/tasks/${task?.id}` : "/tasks"}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Edit Task" : "New Task"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEdit ? "Update task details." : "Create a new task for your organization."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-0 bg-[#111111]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                <CheckSquare className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <CardTitle>{isEdit ? task?.title || "Edit Task" : "Task Details"}</CardTitle>
                <CardDescription>Fill in the task information below.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Review title commitment for Route 66"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-[#1a1a1a] border-0"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Describe the task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-[#1a1a1a] border-0 resize-none"
              />
            </div>

            {/* Status + Priority row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status" className="bg-[#1a1a1a] border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                    <SelectItem value="BLOCKED">Blocked</SelectItem>
                    <SelectItem value="WAITING_ON">Waiting On</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority" className="bg-[#1a1a1a] border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category + Due Date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g. Contracts, Design..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-[#1a1a1a] border-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-[#1a1a1a] border-0"
                />
              </div>
            </div>

            {/* Project + Entity */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="projectId">Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="projectId" className="bg-[#1a1a1a] border-0">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
                    <SelectItem value="none">None</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entityId">Entity</Label>
                <Select value={entityId} onValueChange={setEntityId}>
                  <SelectTrigger id="entityId" className="bg-[#1a1a1a] border-0">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
                    <SelectItem value="none">None</SelectItem>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assignee + Depends On */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assigneeId">Assignee</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger id="assigneeId" className="bg-[#1a1a1a] border-0">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dependsOnId">Depends On</Label>
                <Select value={dependsOnId} onValueChange={setDependsOnId}>
                  <SelectTrigger id="dependsOnId" className="bg-[#1a1a1a] border-0">
                    <SelectValue placeholder="No dependency" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
                    <SelectItem value="none">No dependency</SelectItem>
                    {availableDeps.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-[#1a1a1a] border-0 resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={loading || !title.trim()} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Create Task"}
              </Button>
              <Link href={isEdit ? `/tasks/${task?.id}` : "/tasks"}>
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
