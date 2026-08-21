"use client"

import { AuthShell } from "@/components/auth/auth-shell"
import { useState, useEffect, Suspense } from "react"
import { signIn, getSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, Monitor } from "lucide-react"

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const showRegistered = searchParams.get("registered") === "true"
  const isDemo = searchParams.get("demo") === "true"
  const emailParam = searchParams.get("email") || ""
  const redirect = searchParams.get("redirect") || "/home"

  useEffect(() => {
    fetch("/api/settings/logo")
      .then((res) => res.json())
      .then((data) => setLogoUrl(data.logoUrl))
      .catch(() => {})
  }, [])

  // Pre-fill demo credentials
  useEffect(() => {
    if (isDemo && emailParam) {
      setEmail(emailParam)
    }
  }, [isDemo, emailParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password")
      setLoading(false)
    } else {
      // Check if super admin — redirect to /admin if so
      const session = await getSession()
      const isSuperAdmin = (session?.user as any)?.isSuperAdmin
      if (isSuperAdmin) {
        window.location.href = "/admin"
      } else {
        window.location.href = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/home"
      }
    }
    } catch {
      setError("Unable to sign in right now. Please try again.")
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center space-y-3">
        {logoUrl ? (
          <Link href="/" className="inline-flex items-center justify-center h-12">
            <img
              src={logoUrl}
              alt="Logo"
              className="h-10 max-w-[200px] object-contain"
            />
          </Link>
        ) : (
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors">
            <img src="/logo.svg" alt="Operion" className="h-7 w-7" />
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isDemo ? "Explore the Demo" : "Welcome to Operion"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isDemo ? "No sign-up required — click Sign in to explore" : "AI Chief of Staff for your portfolio"}
            </p>
          </div>
        </div>

        <Card className="glass shadow-2xl">
          <form onSubmit={handleSubmit}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{isDemo ? "Demo access" : "Sign in"}</CardTitle>
              <CardDescription>
                {isDemo
                  ? "Credentials pre-filled. Just click Sign in."
                  : "Enter your credentials to continue"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showRegistered && (
                <div className="rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-400 flex items-center gap-2 border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Account created successfully! Sign in below.
                </div>
              )}
              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              {isDemo && (
                <div className="rounded-lg bg-violet-500/10 px-3 py-2.5 text-sm text-violet-300 flex items-center gap-2 border border-violet-500/20">
                  <Monitor className="h-4 w-4 shrink-0" />
                  Demo access — password: demo123!
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/[0.04] border-0 focus-visible:ring-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/[0.04] border-0 focus-visible:ring-1"
                />
                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </CardContent>
          </form>

          <div className="px-6 pb-2">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="bg-[#262626]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="glass px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
          </div>

          <CardContent className="pt-2 pb-4 space-y-3">
            <a
              href="/api/auth/signin/google?callbackUrl=/home"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-[#262626] bg-white/[0.04] hover:bg-[#222] h-10 px-4 py-2 w-full"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </a>
          </CardContent>

          <CardFooter className="pt-0 pb-6">
            <p className="text-xs text-muted-foreground text-center w-full">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-foreground hover:underline font-medium">
                Create one
              </Link>
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to Operion&apos;s {" "}<Link href="/terms" className="hover:text-foreground hover:underline">Terms of Service</Link>{" "}and <Link href="/privacy" className="hover:text-foreground hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </AuthShell>
  )
}

function LoginSkeleton() {
  return (
    <AuthShell>
      <div className="w-full max-w-sm space-y-8">
        {/* Branded loading — Operion logo with pulsing card skeleton */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
            <img src="/logo.svg" alt="Operion" className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Operion</h1>
            <p className="text-sm text-muted-foreground mt-1">Loading your workspace…</p>
          </div>
        </div>

        {/* Card skeleton matching the real login card */}
        <div className="rounded-xl glass shadow-2xl p-6 space-y-4 animate-pulse">
          <div className="h-5 w-20 bg-white/[0.04] rounded" />
          <div className="h-4 w-48 bg-white/[0.04] rounded" />
          <div className="space-y-2 pt-2">
            <div className="h-3.5 w-12 bg-white/[0.04] rounded" />
            <div className="h-10 w-full bg-white/[0.04] rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-16 bg-white/[0.04] rounded" />
            <div className="h-10 w-full bg-white/[0.04] rounded-lg" />
          </div>
          <div className="h-10 w-full bg-white/[0.04] rounded-lg" />
        </div>
      </div>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
