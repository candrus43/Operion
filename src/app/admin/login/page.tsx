"use client"

import { AuthShell } from "@/components/auth/auth-shell"
import { useState, useEffect, Suspense } from "react"
import { getSession, signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Shield } from "lucide-react"

function AdminLoginForm() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [mode, setMode] = useState<"loading" | "setup" | "login">("loading")
  const [name, setName] = useState("")
  const [orgName, setOrgName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Check if super admin exists
  useEffect(() => {
    fetch("/api/admin/setup")
      .then((res) => res.json())
      .then((data) => setMode(data.exists ? "login" : "setup"))
      .catch(() => setMode("login"))
  }, [])

  // If already authenticated, redirect
  useEffect(() => {
    if (status === "authenticated" && session) {
      const isSuperAdmin = (session.user as any)?.isSuperAdmin
      if (isSuperAdmin) {
        router.push("/admin")
      }
    }
  }, [status, session, router])

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, organizationName: orgName, email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Setup failed")
        setLoading(false)
        return
      }

      // Auto sign in after setup
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Account created but auto sign-in failed. Please try logging in.")
        setMode("login")
        setLoading(false)
      } else {
        router.push("/admin")
        router.refresh()
      }
    } catch {
      setError("Something went wrong")
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid credentials")
      setLoading(false)
      return
    }

    const session = await getSession()
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin

    if (!isSuperAdmin) {
      setError("This account does not have admin access. Please use a super admin account.")
      setLoading(false)
      return
    }

    router.push("/admin")
    router.refresh()
    setLoading(false)
  }

  if (mode === "loading") {
    return (
      <AuthShell>
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-400/10">
              <Shield className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Operion Admin</h1>
              <p className="text-sm text-muted-foreground mt-1">Loading...</p>
            </div>
          </div>
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

  return (
    <AuthShell>
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-400/10">
            <Shield className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Operion Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "setup" ? "Initial admin account setup" : "Sign in to the admin dashboard"}
            </p>
          </div>
        </div>

        <Card className="glass shadow-2xl">
          {mode === "setup" ? (
            <form onSubmit={handleSetup}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Create Admin Account</CardTitle>
                <CardDescription>
                  This is a one-time setup. After this, only this account can access the admin dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    placeholder="Admin User"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-white/[0.04] border-0 focus-visible:ring-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization</Label>
                  <Input
                    id="orgName"
                    placeholder="Operion"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    className="bg-white/[0.04] border-0 focus-visible:ring-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@operion.online"
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
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-white/[0.04] border-0 focus-visible:ring-1"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create Admin Account"}
                </Button>
              </CardContent>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Admin Sign In</CardTitle>
                <CardDescription>Enter your admin credentials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@operion.online"
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
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </CardContent>
            </form>
          )}

          {/* OAuth options — only show on login mode */}
          {mode === "login" && (
            <>
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
                  href="/api/auth/signin/google?callbackUrl=/admin"
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
                <a
                  href="/api/auth/signin/microsoft?callbackUrl=/admin"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-[#262626] bg-white/[0.04] hover:bg-[#222] h-10 px-4 py-2 w-full"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21" fill="none">
                    <path d="M10 1H1V10H10V1Z" fill="#F25022"/>
                    <path d="M20 1H11V10H20V1Z" fill="#7FBA00"/>
                    <path d="M20 11H11V20H20V11Z" fill="#00A4EF"/>
                    <path d="M10 11H1V20H10V11Z" fill="#FFB900"/>
                  </svg>
                  Microsoft
                </a>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            &larr; Back to Operion
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

function AdminLoginSkeleton() {
  return (
    <AuthShell>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-400/10">
            <Shield className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Operion Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">Loading...</p>
          </div>
        </div>
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

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginSkeleton />}>
      <AdminLoginForm />
    </Suspense>
  )
}
