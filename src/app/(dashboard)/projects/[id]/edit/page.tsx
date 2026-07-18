"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
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
import {
  ArrowLeft,
  FolderKanban,
  Loader2,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"

const phases = [
  { value: "ACQUISITION", label: "Acquisition" },
  { value: "DUE_DILIGENCE", label: "Due Diligence" },
  { value: "DESIGN", label: "Design" },
  { value: "PERMITTING", label: "Permitting" },
  { value: "CONSTRUCTION", label: "Construction" },
  { value: "CLOSEOUT", label: "Closeout" },
  { value: "OPERATIONS", label: "Operations" },
]

const statuses = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
]

type Entity = { id: string; name: string }

export default function EditProjectPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [entities, setEntities] = useState<Entity[]>([])

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("ACTIVE")
  const [phase, setPhase] = useState("ACQUISITION")
  const [budget, setBudget] = useState("")
  const [startDate, setStartDate] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [entityId, setEntityId] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const [projRes, entRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch("/api/entities"),
        ])

        if (!projRes.ok) throw new Error("Not found")
        const project = await projRes.json()

        setName(project.name || "")
        setDescription(project.description || "")
        setStatus(project.status || "ACTIVE")
        setPhase(project.phase || "ACQUISITION")
        setBudget(project.budget ? String(project.budget) : "")
        setStartDate(
          project.startDate
            ? new Date(project.startDate).toISOString().split("T")[0]
            : ""
        )
        setTargetDate(
          project.targetDate
            ? new Date(project.targetDate).toISOString().split("T")[0]
            : ""
        )
        setEntityId(project.entityId || "")

        if (entRes.ok) {
          setEntities(await entRes.json())
        }
      } catch {
        toast.error("Project not found")
        router.push("/projects")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      const body: any = {
        name: name.trim(),
        description: description.trim() || null,
        status,
        phase,
        budget: budget ? budget : null,
        startDate: startDate || null,
        targetDate: targetDate || null,
        entityId: entityId || null,
      }

      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update project")
      }

      toast.success("Project updated")
      router.push(`/projects/${id}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to update project")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete project")
      }
      toast.success("Project deleted")
      router.push("/projects")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete")
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-[#1a1a1a] rounded" />
          <div className="h-96 bg-[#111111] rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Edit Project</h1>
          <p className="text-sm text-muted-foreground mt-1">Update project details.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-0 bg-[#111111]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
                <FolderKanban className="h-5 w-5 text-sky-400" />
              </div>
              <div>
                <CardTitle>{name || "Edit Project"}</CardTitle>
                <CardDescription>Modify the project details below.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Grand Hotel Renovation"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                placeholder="Describe the project scope, goals, and key deliverables..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-[#1a1a1a] border-0 resize-none"
              />
            </div>

            {/* Status + Phase */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status" className="bg-[#1a1a1a] border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
                    {statuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phase">Phase</Label>
                <Select value={phase} onValueChange={setPhase}>
                  <SelectTrigger id="phase" className="bg-[#1a1a1a] border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
                    {phases.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                type="number"
                placeholder="e.g. 2500000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="bg-[#1a1a1a] border-0"
              />
            </div>

            {/* Start Date + Target Date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-[#1a1a1a] border-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Date</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="bg-[#1a1a1a] border-0"
                />
              </div>
            </div>

            {/* Entity */}
            <div className="space-y-2">
              <Label htmlFor="entityId">Entity</Label>
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger id="entityId" className="bg-[#1a1a1a] border-0">
                  <SelectValue placeholder="Select an entity (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border border-white/[0.05]">
                  <SelectItem value="none">None</SelectItem>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving || !name.trim()} className="gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Link href={`/projects/${id}`}>
                  <Button type="button" variant="ghost">
                    Cancel
                  </Button>
                </Link>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-[#181818] border border-white/[0.06] p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Delete Project</h3>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. All project data will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="gap-2 bg-red-600 hover:bg-red-700"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
