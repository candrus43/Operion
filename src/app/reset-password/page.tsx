"use client"

import { AuthShell } from "@/components/auth/auth-shell"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong")
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  // Missing or invalid token
  if (!token) {
    return (
      <AuthShell>
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors">
              <img src="/logo.svg" alt="Operion" className="h-7 w-7" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Invalid link</h1>
              <p className="text-sm text-muted-foreground mt-1">
                This password reset link is missing or invalid
              </p>
            </div>
          </div>

          <Card className="glass shadow-2xl">
            <CardContent className="pt-6 pb-6">
              <div className="rounded-lg bg-amber-500/10 px-3 py-4 text-sm text-amber-400 flex items-start gap-3 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Invalid or missing token</p>
                  <p className="text-amber-400/70 mt-1">
                    The reset link you followed is invalid. Please request a new password reset.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0 pb-6 flex flex-col gap-3">
              <Link href="/forgot-password" className="w-full">
                <Button variant="default" className="w-full">
                  Request new reset link
                </Button>
              </Link>
              <Link
                href="/login"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to sign in
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AuthShell>
    )
  }

  if (success) {
    return (
      <AuthShell>
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors">
              <img src="/logo.svg" alt="Operion" className="h-7 w-7" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Password reset</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your password has been updated
              </p>
            </div>
          </div>

          <Card className="glass shadow-2xl">
            <CardContent className="pt-6 pb-6">
              <div className="rounded-lg bg-emerald-500/10 px-3 py-4 text-sm text-emerald-400 flex items-start gap-3 border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Password reset successfully</p>
                  <p className="text-emerald-400/70 mt-1">
                    You can now sign in with your new password.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0 pb-6">
              <Link href="/login" className="w-full">
                <Button className="w-full">Sign in</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors">
            <img src="/logo.svg" alt="Operion" className="h-7 w-7" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a strong password for your account
            </p>
          </div>
        </div>

        <Card className="glass shadow-2xl">
          <form onSubmit={handleSubmit}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">New password</CardTitle>
              <CardDescription>Must be at least 8 characters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-white/[0.04] border-0 focus-visible:ring-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-white/[0.04] border-0 focus-visible:ring-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Resetting..." : "Reset password"}
              </Button>
            </CardContent>
          </form>
          <CardFooter className="pt-0 pb-6">
            <Link
              href="/login"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </AuthShell>
  )
}

function ResetPasswordSkeleton() {
  return (
    <AuthShell>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors">
            <img src="/logo.svg" alt="Operion" className="h-7 w-7" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
            <p className="text-sm text-muted-foreground mt-1">Loading...</p>
          </div>
        </div>
      </div>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
