"use client"

import { useState } from "react"
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
import { ArrowLeft, Calendar, Loader2 } from "lucide-react"
import { toast } from "sonner"

type Project = { id: string; name: string }

interface MeetingFormProps {
  projects: Project[]
  meeting?: any
  isEdit?: boolean
}

export function MeetingForm({ projects, meeting, isEdit }: MeetingFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Parse date for form input
  const parseDateForInput = (d: any): string => {
    if (!d) return ""
    const date = new Date(d)
    const yy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    const dd = String(date.getDate()).padStart(2, "0")
    const hh = String(date.getHours()).padStart(2, "0")
    const min = String(date.getMinutes()).padStart(2, "0")
    return `${yy}-${mm}-${dd}T${hh}:${min}`
  }

  const [title, setTitle] = useState(meeting?.title || "")
  const [dateTime, setDateTime] = useState(parseDateForInput(meeting?.date))
  const [location, setLocation] = useState(meeting?.location || "")
  const [projectId, setProjectId] = useState(meeting?.projectId || "")
  const [notes, setNotes] = useState(meeting?.notes || "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !dateTime) return

    setLoading(true)
    try {
      const body = {
        title: title.trim(),
        date: new Date(dateTime).toISOString(),
        location: location.trim() || null,
        projectId: projectId || null,
        notes: notes.trim() || null,
      }

      const fetchUrl = isEdit ? `/api/meetings/${meeting.id}` : "/api/meetings"
      const method = isEdit ? "PATCH" : "POST"

      const res = await fetch(fetchUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save meeting")
      }

      toast.success(isEdit ? "Meeting updated" : "Meeting scheduled")
      router.push("/calendar")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to save meeting")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!isEdit || !meeting?.id) return
    if (!confirm("Are you sure you want to delete this meeting?")) return

    setLoading(true)
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete meeting")
      }
      toast.success("Meeting deleted")
      router.push("/calendar")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete meeting")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/calendar">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Edit Meeting" : "New Meeting"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEdit ? "Update meeting details." : "Schedule a new meeting."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-0 bg-[#111111]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <Calendar className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <CardTitle>{isEdit ? "Edit Meeting" : "Meeting Details"}</CardTitle>
                <CardDescription>Fill in the meeting information below.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Weekly construction walkthrough"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-[#1a1a1a] border-0"
                required
              />
            </div>

            {/* Date/Time + Location */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateTime">Date & Time *</Label>
                <Input
                  id="dateTime"
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="bg-[#1a1a1a] border-0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Conference Room A"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-[#1a1a1a] border-0"
                />
              </div>
            </div>

            {/* Project */}
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

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Meeting notes or agenda..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-[#1a1a1a] border-0 resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={loading || !title.trim() || !dateTime} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Schedule Meeting"}
              </Button>
              <Link href="/calendar">
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
              {isEdit && (
                <div className="flex-1" />
              )}
              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
