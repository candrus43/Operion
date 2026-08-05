"use client"

import { AuthShell } from "@/components/auth/auth-shell"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [state, setState] = useState<"loading" | "valid" | "invalid" | "expired" | "error">("loading")
  const [userInfo, setUserInfo] = useState<{ name: string; email: string; orgName: string } | null>(null)
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) {
      setState("invalid")
      return
    }
    // Validate token
    fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setState("valid")
          setUserInfo({ name: data.name, email: data.email, orgName: data.orgName })
          setName(data.name || "")
        } else {
          setState(data.reason === "expired" ? "expired" : "invalid")
        }
      })
      .catch(() => setState("error"))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Name is required")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), password }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
      } else {
        setError(data.error || "Failed to accept invitation")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!token || state === "invalid") {
    return (
      <AuthShell>
        <Card className="w-full max-w-md glass border-white/[0.06]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <span className="text-2xl">⚠️</span>
            </div>
            <CardTitle className="text-white">Invalid Invitation</CardTitle>
            <CardDescription className="text-muted-foreground">
              This invitation link is invalid or has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Please contact the person who invited you and ask them to send a new invitation.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/login")}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </AuthShell>
    )
  }

  if (state === "expired") {
    return (
      <AuthShell>
        <Card className="w-full max-w-md glass border-white/[0.06]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <span className="text-2xl">⏰</span>
            </div>
            <CardTitle className="text-white">Invitation Expired</CardTitle>
            <CardDescription className="text-muted-foreground">
              This invitation link has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Please contact the person who invited you and ask them to send a new invitation.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/login")}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </AuthShell>
    )
  }

  if (state === "error") {
    return (
      <AuthShell>
        <Card className="w-full max-w-md glass border-white/[0.06]">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Something went wrong</CardTitle>
            <CardDescription className="text-muted-foreground">
              Unable to validate your invitation. Please try again later.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => router.push("/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </AuthShell>
    )
  }

  if (state === "loading") {
    return (
      <AuthShell>
        <div className="animate-spin h-8 w-8 border-2 border-white/20 border-t-white rounded-full" />
      </AuthShell>
    )
  }

  if (success) {
    return (
      <AuthShell>
        <Card className="w-full max-w-md glass border-white/[0.06]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <span className="text-2xl">✓</span>
            </div>
            <CardTitle className="text-white">Account Activated</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your account has been set up successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              You can now log in with your email and password.
            </p>
            <Button className="w-full" onClick={() => router.push("/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-md glass border-white/[0.06]">
        <CardHeader className="text-center">
          <CardTitle className="text-white">Accept Invitation</CardTitle>
          <CardDescription className="text-muted-foreground">
            {userInfo?.orgName
              ? `You've been invited to join ${userInfo.orgName}`
              : "Set up your account to get started"}
          </CardDescription>
          {userInfo?.email && (
            <p className="text-xs text-muted-foreground/60 mt-1">{userInfo.email}</p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1.5">
                Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="bg-white/[0.04] border-white/[0.06]"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1.5">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="bg-white/[0.04] border-white/[0.06]"
                required
                minLength={6}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted-foreground mb-1.5">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="bg-white/[0.04] border-white/[0.06]"
                required
                minLength={6}
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Setting up account..." : "Set Up Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <div className="animate-spin h-8 w-8 border-2 border-white/20 border-t-white rounded-full" />
        </AuthShell>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  )
}
