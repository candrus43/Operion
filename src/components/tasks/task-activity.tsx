"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Ban, Clock, MessageSquare, Sparkles, User, CalendarClock, ArrowRightLeft, SendHorizonal, CheckCircle2, RotateCcw, XCircle } from "lucide-react"

interface TaskEvent {
  id: string
  action: string
  actorName: string | null
  details: Record<string, unknown> | null
  at: string
}

function timeAgo(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function displayDate(v?: unknown): string | null {
  if (typeof v !== "string") return null
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function actionMeta(action: string): { icon: React.ReactNode; label: string; color: string } {
  switch (action) {
    case "BLOCKED": return { icon: <Ban className="h-3.5 w-3.5" />, label: "Blocked", color: "text-red-400 bg-red-500/10" }
    case "WAITING_ON": return { icon: <Clock className="h-3.5 w-3.5" />, label: "Marked waiting", color: "text-amber-400 bg-amber-500/10" }
    case "REVIEW_SUBMITTED": return { icon: <SendHorizonal className="h-3.5 w-3.5" />, label: "Submitted for review", color: "text-purple-400 bg-purple-500/10" }
    case "REVIEW_APPROVED": return { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Review approved", color: "text-emerald-400 bg-emerald-500/10" }
    case "REVIEW_REJECTED": return { icon: <XCircle className="h-3.5 w-3.5" />, label: "Review rejected", color: "text-red-400 bg-red-500/10" }
    case "REVIEW_REQUESTED_CHANGES": return { icon: <RotateCcw className="h-3.5 w-3.5" />, label: "Requested changes", color: "text-amber-400 bg-amber-500/10" }
    case "COMMENT": return { icon: <MessageSquare className="h-3.5 w-3.5" />, label: "Comment added", color: "text-amber-400 bg-amber-500/10" }
    case "AI_REFRESH": return { icon: <Sparkles className="h-3.5 w-3.5" />, label: "AI suggestion refreshed", color: "text-violet-400 bg-violet-500/10" }
    case "ASSIGNEE_CHANGE": return { icon: <User className="h-3.5 w-3.5" />, label: "Assignee changed", color: "text-blue-400 bg-blue-500/10" }
    case "DUE_CHANGE": return { icon: <CalendarClock className="h-3.5 w-3.5" />, label: "Due date changed", color: "text-blue-400 bg-blue-500/10" }
    case "STATUS_CHANGE": return { icon: <ArrowRightLeft className="h-3.5 w-3.5" />, label: "Status changed", color: "text-zinc-400 bg-zinc-500/10" }
    default: return { icon: <Activity className="h-3.5 w-3.5" />, label: action.replace(/_/g, " "), color: "text-zinc-400 bg-zinc-500/10" }
  }
}

function detailsText(action: string, details: Record<string, unknown> | null): string {
  if (!details) return ""
  switch (action) {
    case "STATUS_CHANGE":
      return `${String(details.from || "?").replace(/_/g, " ")} → ${String(details.to || "?").replace(/_/g, " ")}`
    case "BLOCKED": {
      const parts: string[] = []
      if (details.blockedReason) parts.push(`Reason: ${details.blockedReason}`)
      if (details.waitingOn) parts.push(`On: ${details.waitingOn}`)
      const d = displayDate(details.expectedResolutionDate)
      if (d) parts.push(`Expected: ${d}`)
      if (details.escalationOwner) parts.push(`Escalate: ${details.escalationOwner}`)
      return parts.join(" · ")
    }
    case "WAITING_ON": {
      const parts: string[] = []
      if (details.waitingOn) parts.push(`On: ${details.waitingOn}`)
      if (details.whatRequired) parts.push(`Needs: ${details.whatRequired}`)
      const d = displayDate(details.expectedResolutionDate)
      if (d) parts.push(`Follow-up: ${d}`)
      if (details.relatedContact) parts.push(`Contact: ${details.relatedContact}`)
      if (details.escalationOwner) parts.push(`Escalate: ${details.escalationOwner}`)
      return parts.join(" · ")
    }
    case "REVIEW_SUBMITTED": {
      const d = displayDate(details.reviewRequiredBy)
      return d ? `Due: ${d}` : ""
    }
    case "COMMENT":
      return typeof details.preview === "string" ? details.preview : ""
    case "DUE_CHANGE": {
      const d = displayDate(details.dueDate)
      return d ? `Due ${d}` : "Due cleared"
    }
    default:
      return ""
  }
}

export function TaskActivity({ taskId }: { taskId: string }) {
  const [events, setEvents] = useState<TaskEvent[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/events`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    load()
    const handler = () => load()
    window.addEventListener("task-changed", handler)
    return () => window.removeEventListener("task-changed", handler)
  }, [load])

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-400" />
          Activity
          {events.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">({events.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-7 w-7 rounded-lg bg-white/[0.04]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-40 bg-white/[0.04] rounded" />
                  <div className="h-3 w-56 bg-white/[0.04] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 py-4 text-center">
            No activity yet. Status changes, reviews, comments, and AI refreshes will appear here.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const meta = actionMeta(ev.action)
              const text = detailsText(ev.action, ev.details)
              return (
                <div key={ev.id} className="flex gap-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5 ${meta.color}`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-medium">{ev.actorName || "Someone"}</span>
                      <span className="text-xs text-muted-foreground">{meta.label}</span>
                      <span className="text-[10px] text-muted-foreground/60 ml-auto">{timeAgo(ev.at)}</span>
                    </div>
                    {text && (
                      <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{text}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
