"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { CheckCircle2, PlayCircle, Ban, Clock, ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { notifyTaskChanged } from "@/lib/task-events-client"

interface OrgMember { id: string; name: string }

interface StatusActionsProps {
  taskId: string
  currentStatus: string
  assigneeId?: string | null
}

type DialogKind = "blocked" | "waiting" | "review" | null

/** Date -> YYYY-MM-DD for <input type="date"> */
function toDateInput(d?: string | null): string {
  if (!d) return ""
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ""
  return dt.toISOString().slice(0, 10)
}

export function StatusActions({ taskId, currentStatus, assigneeId }: StatusActionsProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [members, setMembers] = useState<OrgMember[]>([])

  // Blocked form
  const [blockedReason, setBlockedReason] = useState("")
  const [blockedWaitOn, setBlockedWaitOn] = useState("")
  const [blockedResolveDate, setBlockedResolveDate] = useState("")
  const [escalationOwner, setEscalationOwner] = useState("")
  // Waiting form
  const [waitOn, setWaitOn] = useState("")
  const [whatRequired, setWhatRequired] = useState("")
  const [followUpDate, setFollowUpDate] = useState("")
  const [relatedContact, setRelatedContact] = useState("")
  // Review form
  const [reviewerId, setReviewerId] = useState("")
  const [reviewDueDate, setReviewDueDate] = useState("")

  useEffect(() => {
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((users: OrgMember[]) => setMembers(users))
      .catch(() => {})
  }, [])

  function resetForms() {
    setBlockedReason(""); setBlockedWaitOn(""); setBlockedResolveDate(""); setEscalationOwner("")
    setWaitOn(""); setWhatRequired(""); setFollowUpDate(""); setRelatedContact("")
    setReviewerId(""); setReviewDueDate("")
  }

  async function patch(payload: Record<string, unknown>) {
    setBusy(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.message || data.error || "Something went wrong.")
        return false
      }
      toast.success("Task updated")
      notifyTaskChanged()
      router.refresh()
      return true
    } catch {
      toast.error("Failed to update task.")
      return false
    } finally {
      setBusy(false)
    }
  }

  function openDialog(kind: Exclude<DialogKind, null>) {
    resetForms()
    setDialog(kind)
  }

  async function submitBlocked() {
    const ok = await patch({
      status: "BLOCKED",
      blockedReason: blockedReason.trim() || null,
      waitingOn: blockedWaitOn.trim() || null,
      blockedSince: new Date().toISOString(),
      expectedResolutionDate: blockedResolveDate ? new Date(blockedResolveDate).toISOString() : null,
      escalationOwner: escalationOwner.trim() || null,
    })
    if (ok) setDialog(null)
  }

  async function submitWaiting() {
    const ok = await patch({
      status: "WAITING_ON",
      waitingOn: waitOn.trim() || null,
      waitingOnSince: new Date().toISOString(),
      expectedResolutionDate: followUpDate ? new Date(followUpDate).toISOString() : null,
      whatRequired: whatRequired.trim() || null,
      relatedContact: relatedContact.trim() || null,
      escalationOwner: escalationOwner.trim() || null,
    })
    if (ok) setDialog(null)
  }

  async function submitReview() {
    const ok = await patch({
      status: "READY_FOR_REVIEW",
      reviewRequestedAt: new Date().toISOString(),
      reviewRequiredBy: reviewDueDate ? new Date(reviewDueDate).toISOString() : null,
      reviewedById: reviewerId || null,
      approvalStatus: "PENDING",
    })
    if (ok) setDialog(null)
  }

  async function simpleStatus(payload: Record<string, unknown>) {
    await patch(payload)
  }

  const reviewActions = currentStatus === "READY_FOR_REVIEW"
  const showInProgress = currentStatus !== "IN_PROGRESS" && currentStatus !== "READY_FOR_REVIEW"
  const showDone = currentStatus !== "DONE" && currentStatus !== "READY_FOR_REVIEW"
  const showSubmitReview = currentStatus === "IN_PROGRESS"

  return (
    <div className="flex flex-col gap-2">
      {reviewActions && (
        <>
          <Button
            variant="default" size="sm" className="w-full justify-start gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={busy} onClick={() => simpleStatus({ status: "DONE", approvalStatus: "APPROVED", reviewedAt: new Date().toISOString() })}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-200" />}
            Approve — Mark Done
          </Button>
          <Button
            variant="outline" size="sm" className="w-full justify-start gap-2 border-amber-500/30 hover:bg-amber-500/10"
            disabled={busy} onClick={() => simpleStatus({ status: "IN_PROGRESS", waitingOnUserId: assigneeId || null, approvalStatus: "CHANGES_REQUESTED", reviewedAt: new Date().toISOString() })}
          >
            <ArrowLeft className="h-4 w-4 text-amber-400" />
            Request Changes
          </Button>
        </>
      )}

      {showInProgress && (
        <Button
          variant="outline" size="sm" className="w-full justify-start gap-2" disabled={busy}
          onClick={() => simpleStatus({ status: "IN_PROGRESS" })}
        >
          <PlayCircle className="h-4 w-4 text-blue-400" />
          Mark In Progress
        </Button>
      )}

      {showDone && (
        <Button
          variant="outline" size="sm" className="w-full justify-start gap-2" disabled={busy}
          onClick={() => simpleStatus({ status: "DONE" })}
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Mark Done
        </Button>
      )}

      {showSubmitReview && (
        <Button
          variant="outline" size="sm" className="w-full justify-start gap-2 border-purple-500/30 hover:bg-purple-500/10"
          disabled={busy} onClick={() => openDialog("review")}
        >
          <CheckCircle2 className="h-4 w-4 text-purple-400" />
          Submit for Review
        </Button>
      )}

      {currentStatus !== "BLOCKED" && (
        <Button
          variant="outline" size="sm" className="w-full justify-start gap-2" disabled={busy}
          onClick={() => openDialog("blocked")}
        >
          <Ban className="h-4 w-4 text-red-400" />
          Mark Blocked
        </Button>
      )}

      {currentStatus !== "WAITING_ON" && (
        <Button
          variant="outline" size="sm" className="w-full justify-start gap-2" disabled={busy}
          onClick={() => openDialog("waiting")}
        >
          <Clock className="h-4 w-4 text-amber-400" />
          Mark Waiting
        </Button>
      )}

      {/* ── BLOCKED dialog ── */}
      <Dialog open={dialog === "blocked"} onOpenChange={(o) => (o ? null : setDialog(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark blocked</DialogTitle>
            <DialogDescription>Capture why this task can&apos;t proceed. All fields optional — primary action proceeds regardless.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="blk-reason" className="flex items-center gap-1">Blocking reason</Label>
              <Textarea id="blk-reason" value={blockedReason} onChange={(e) => setBlockedReason(e.target.value)} placeholder="e.g. Awaiting permit from city planning" className="min-h-[60px] bg-white/[0.04] border-white/[0.06] text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="blk-wait">Person / item you&apos;re waiting on</Label>
              <Input id="blk-wait" value={blockedWaitOn} onChange={(e) => setBlockedWaitOn(e.target.value)} placeholder="e.g. City planning office" className="bg-white/[0.04] border-white/[0.06]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="blk-resolve" className="block">Expected resolution</Label>
                <Input id="blk-resolve" type="date" value={blockedResolveDate} onChange={(e) => setBlockedResolveDate(e.target.value)} className="bg-white/[0.04] border-white/[0.06]" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="blk-esc" className="block">Escalation owner</Label>
                <Input id="blk-esc" value={escalationOwner} onChange={(e) => setEscalationOwner(e.target.value)} placeholder="e.g. Morgan" className="bg-white/[0.04] border-white/[0.06]" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDialog(null)}>Cancel</Button>
            <Button size="sm" variant="destructive" className="gap-1.5" disabled={busy} onClick={submitBlocked}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Mark Blocked
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── WAITING dialog ── */}
      <Dialog open={dialog === "waiting"} onOpenChange={(o) => (o ? null : setDialog(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark waiting</DialogTitle>
            <DialogDescription>Who is it waiting on, and what&apos;s needed to move forward? All fields optional.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="wt-on">Waiting on (who / what)</Label>
                <Input id="wt-on" value={waitOn} onChange={(e) => setWaitOn(e.target.value)} placeholder="e.g. Vendor invoice" className="bg-white/[0.04] border-white/[0.06]" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="wt-followup">Follow-up date</Label>
                <Input id="wt-followup" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="bg-white/[0.04] border-white/[0.06]" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="wt-req">What&apos;s required</Label>
              <Textarea id="wt-req" value={whatRequired} onChange={(e) => setWhatRequired(e.target.value)} placeholder="e.g. Confirm wiring instructions and ETA" className="min-h-[60px] bg-white/[0.04] border-white/[0.06] text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wt-contact">Related contact</Label>
              <Input id="wt-contact" value={relatedContact} onChange={(e) => setRelatedContact(e.target.value)} placeholder="e.g. Sarah at vendor (sarah@vendor.com)" className="bg-white/[0.04] border-white/[0.06]" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wt-esc">Escalation owner</Label>
              <Input id="wt-esc" value={escalationOwner} onChange={(e) => setEscalationOwner(e.target.value)} placeholder="Who to chase if no response" className="bg-white/[0.04] border-white/[0.06]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDialog(null)}>Cancel</Button>
            <Button size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700" disabled={busy} onClick={submitWaiting}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Mark Waiting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── REVIEW dialog ── */}
      <Dialog open={dialog === "review"} onOpenChange={(o) => (o ? null : setDialog(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for review</DialogTitle>
            <DialogDescription>Who should review this, and by when? All fields optional.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Reviewer</Label>
              <Select value={reviewerId} onValueChange={setReviewerId}>
                <SelectTrigger className="w-full bg-white/[0.04] border-white/[0.06]">
                  <SelectValue placeholder="Select reviewer" />
                </SelectTrigger>
                <SelectContent>
                  {members.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No team members</div>}
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rev-due">Review due date</Label>
              <Input id="rev-due" type="date" value={reviewDueDate} onChange={(e) => setReviewDueDate(e.target.value)} className="bg-white/[0.04] border-white/[0.06]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDialog(null)}>Cancel</Button>
            <Button size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-700" disabled={busy} onClick={submitReview}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Submit for Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
