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
import { ArrowLeft, FolderKanban, Loader2 } from "lucide-react"
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

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [entities, setEntities] = useState<Entity[]>([])
  const [entitiesLoading, setEntitiesLoading] = useState(true)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("ACTIVE")
  const [phase, setPhase] = useState("ACQUISITION")
  const [budget, setBudget] = useState("")
  const [startDate, setStartDate] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [entityId, setEntityId] = useState("")

  useEffect(() => {
    async function loadEntities() {
      try {
        const res = await fetch("/api/entities")
        if (res.ok) {
          const data = await res.json()
          setEntities(data)
        }
      } catch {
        // silent
      } finally {
        setEntitiesLoading(false)
      }
    }
    loadEntities()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
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

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create project")
      }

      const project = await res.json()
      toast.success("Project created successfully")
      router.push(`/projects/${project.id}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to create project")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Project</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new project to track progress, budget, and timeline.
          </p>
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
                <CardTitle>Project Details</CardTitle>
                <CardDescription>Fill in the project information below.</CardDescription>
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
                  <SelectValue placeholder={entitiesLoading ? "Loading..." : "Select an entity (optional)"} />
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

            {/* Submit */}
            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={loading || !name.trim()} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Project
              </Button>
              <Link href="/projects">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
