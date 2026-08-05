"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { SettingsNav } from "../settings-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Shield,
  Clock,
  Key,
  Copy,
  Check,
  Loader2,
  XCircle,
  History,
  Eye,
  Pencil,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"

interface SupportSession {
  id: string
  permissions: string
  expiresAt: string
  revokedAt: string | null
  createdAt: string
  createdBy: string
  status: "active" | "expired" | "revoked"
}

export default function SupportSettingsPage() {
  const { data: session, status: authStatus } = useSession()

  // Grant state
  const [duration, setDuration] = useState("30")
  const [writeAccess, setWriteAccess] = useState(false)
  const [granting, setGranting] = useState(false)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [generatedExpires, setGeneratedExpires] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Active session state
  const [activeSession, setActiveSession] = useState<SupportSession | null>(null)
  const [revoking, setRevoking] = useState(false)

  // Past sessions state
  const [pastSessions, setPastSessions] = useState<SupportSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  const isOwner = (session?.user as any)?.role === "OWNER"

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/support/sessions")
      if (!res.ok) return
      const data = await res.json()
      const sessions: SupportSession[] = data.sessions || []

      // Separate active from past
      const active = sessions.find((s) => s.status === "active")
      const past = sessions.filter((s) => s.status !== "active")

      setActiveSession(active || null)
      setPastSessions(past)
    } catch (err) {
      console.error("Failed to fetch sessions:", err)
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    if (isOwner) {
      fetchSessions()
    } else {
      setLoadingSessions(false)
    }
  }, [isOwner, fetchSessions])

  if (authStatus === "loading") return null
  if (!session?.user) redirect("/login")

  const handleGrant = async () => {
    setGranting(true)
    try {
      const res = await fetch("/api/support/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMinutes: parseInt(duration),
          writeAccess,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to grant support access")
        return
      }

      setGeneratedToken(data.token)
      setGeneratedExpires(data.expiresAt)
      toast.success("Support access link generated")
      fetchSessions()
    } catch (err) {
      console.error("Grant failed:", err)
      toast.error("Failed to generate access link")
    } finally {
      setGranting(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedToken) return
    const link = `https://operion.ctonew.app/support/access?token=${generatedToken}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success("Link copied to clipboard")
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // Fallback
      toast.error("Failed to copy. Please copy manually.")
    }
  }

  const handleRevoke = async () => {
    setRevoking(true)
    try {
      const res = await fetch("/api/support/revoke", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to revoke access")
        return
      }

      toast.success("Support access revoked")
      setActiveSession(null)
      setGeneratedToken(null)
      fetchSessions()
    } catch (err) {
      console.error("Revoke failed:", err)
      toast.error("Failed to revoke access")
    } finally {
      setRevoking(false)
    }
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const formatDuration = (iso: string) => {
    const expires = new Date(iso).getTime()
    const now = Date.now()
    const diff = Math.max(0, expires - now)
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    if (hours > 0) return `${hours}h ${minutes}m remaining`
    return `${minutes}m remaining`
  }

  const accessLink = generatedToken
    ? `https://operion.ctonew.app/support/access?token=${generatedToken}`
    : ""

  return (
    <div className="max-w-2xl space-y-8">
      <SettingsNav />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support Access</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grant time-limited access to Operion support for troubleshooting. All actions are logged.
        </p>
      </div>

      {!isOwner && (
        <Card className="border-[#262626] glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Only organization owners can manage support access. Contact your owner to request changes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isOwner && (
        <>
          <Separator className="bg-[#262626]" />

          {/* Grant Support Access Card */}
          <Card className="border-[#262626] glass">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-400" />
                Grant Support Access
              </CardTitle>
              <CardDescription>
                Generate a secure, time-limited link that Operion support can use to view your
                account. You can revoke access at any time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Active Session Display */}
              {activeSession && (
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                        <Eye className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          Active Support Session
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activeSession.permissions === "READ" ? "Read-only" : "Read/Write"} ·{" "}
                          {formatDuration(activeSession.expiresAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleRevoke}
                      disabled={revoking}
                      variant="outline"
                      className="border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs h-8"
                    >
                      {revoking ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                          Revoke
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Generated Token Display */}
              {generatedToken && (
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-green-300">Access Link Generated</p>
                    <Badge
                      variant="outline"
                      className="border-green-500/30 bg-green-500/10 text-green-400 text-xs"
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-green-200/70 bg-[#0d0d0d] rounded px-3 py-2 break-all border border-[#262626]">
                      {accessLink}
                    </code>
                    <Button
                      onClick={handleCopy}
                      variant="outline"
                      size="sm"
                      className="border-[#262626] bg-white/[0.04] hover:bg-[#222] shrink-0 h-9"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {generatedExpires && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Expires: {formatDate(generatedExpires)}
                    </p>
                  )}
                </div>
              )}

              {/* Configuration */}
              <div className="space-y-4">
                {/* Duration */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Access Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="border-[#262626] bg-[#0d0d0d] text-white w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[#262626] glass">
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="480">8 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Write Access Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-[#262626] bg-[#0d0d0d] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04]">
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Allow changes</p>
                      <p className="text-xs text-muted-foreground">
                        Let support make changes to your account
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={writeAccess ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWriteAccess(!writeAccess)}
                    className={
                      writeAccess
                        ? "bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                        : "border-[#262626] bg-white/[0.04] hover:bg-[#222] text-muted-foreground text-xs h-8"
                    }
                  >
                    {writeAccess ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGrant}
                disabled={granting}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
              >
                {granting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                {granting ? "Generating..." : "Generate Access Link"}
              </Button>
            </CardContent>
          </Card>

          {/* Past Sessions */}
          <Card className="border-[#262626] glass">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                Support History
              </CardTitle>
              <CardDescription>
                Past support access sessions and their status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : pastSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No previous support sessions.
                </p>
              ) : (
                <div className="space-y-3">
                  {pastSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-lg border border-[#262626] bg-[#0d0d0d] p-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                          {session.status === "revoked" ? (
                            <XCircle className="h-4 w-4 text-red-400" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {session.permissions === "READ" ? "Read-only" : "Read/Write"} access
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(session.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          session.status === "revoked"
                            ? "border-red-500/30 bg-red-500/10 text-red-400 shrink-0 ml-2"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-400 shrink-0 ml-2"
                        }
                      >
                        {session.status === "revoked" ? "Revoked" : "Expired"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
