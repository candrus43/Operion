"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, ArrowRight } from "lucide-react"

export default function DemoLoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email: "navid@movement.com",
      password: "password123",
      redirect: false,
    })

    if (result?.error) {
      setError("Unable to sign in to the demo. Please try again.")
      setLoading(false)
    } else {
      router.push("/home")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#080808]">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/20">
            <img src="/logo.svg" alt="Operion" className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Explore the Demo</h1>
            <p className="text-sm text-muted-foreground mt-1">
              No sign-up required — click below to explore Operion
            </p>
          </div>
        </div>

        <Card className="border-0 bg-[#111111] shadow-2xl">
          <form onSubmit={handleSubmit}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Demo access</CardTitle>
              <CardDescription>
                Credentials are pre-filled. Just click to enter.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="rounded-lg bg-violet-500/10 px-3 py-2.5 text-sm text-violet-300 border border-violet-500/20">
                <p className="font-medium mb-0.5">Demo account</p>
                <p className="text-violet-300/70 text-xs">
                  navid@movement.com · password123
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value="navid@movement.com"
                  readOnly
                  className="bg-[#1a1a1a] border-0 focus-visible:ring-1 text-muted-foreground cursor-default"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value="password123"
                  readOnly
                  className="bg-[#1a1a1a] border-0 focus-visible:ring-1 text-muted-foreground cursor-default"
                />
              </div>
              <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-500" disabled={loading}>
                {loading ? (
                  "Signing in..."
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Explore the Demo
                  </>
                )}
              </Button>
            </CardContent>
          </form>

          <CardFooter className="pt-0 pb-6 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground text-center w-full">
              Want your own account?{" "}
              <Link href="/register" className="text-violet-400 hover:underline font-medium">
                Start a 14-day free trial
                <ArrowRight className="inline ml-1 h-3 w-3" />
              </Link>
            </p>
            <Link
              href="/login"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              Sign in to your account
            </Link>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to Operion&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
