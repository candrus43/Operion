"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
    } catch {
      // Silently handle errors — don't reveal anything
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#080808]">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors">
            <img src="/logo.svg" alt="Operion" className="h-7 w-7" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>
        </div>

        <Card className="border-0 bg-[#111111] shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Forgot password</CardTitle>
            <CardDescription>We&apos;ll email you a secure reset link</CardDescription>
          </CardHeader>

          {sent ? (
            <CardContent className="space-y-4 pb-6">
              <div className="rounded-lg bg-emerald-500/10 px-3 py-4 text-sm text-emerald-400 flex items-start gap-3 border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Check your email</p>
                  <p className="text-emerald-400/70 mt-1">
                    If an account exists for {email}, we&apos;ve sent a password reset link. It expires in 1 hour.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full border-[#262626] bg-[#1a1a1a] hover:bg-[#222]"
                onClick={() => { setSent(false); setEmail("") }}
              >
                Send another
              </Button>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@movement.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 bg-[#1a1a1a] border-0 focus-visible:ring-1"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </CardContent>
            </form>
          )}

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
    </div>
  )
}
