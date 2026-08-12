"use client"

import { AuthShell } from "@/components/auth/auth-shell"
import { useEffect, useRef, useState } from "react"
import { signIn } from "next-auth/react"
import { Sparkles, AlertTriangle } from "lucide-react"

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "morgan@blackstonepartners.demo"
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "demo123!"

export default function DemoLoginPage() {
  const attempted = useRef(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    async function enter() {
      try {
        const result = await signIn("credentials", {
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          redirect: false,
        })

        if (result?.ok) {
          // Full page reload to pick up the new session cookie
          window.location.href = "/home"
        } else {
          setError(true)
        }
      } catch (_) {
        setError(true)
      }
    }

    const t = setTimeout(enter, 800)
    return () => clearTimeout(t)
  }, [])

  if (error) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <AlertTriangle className="h-10 w-10 text-amber-400" />
          <h1 className="text-lg font-semibold text-white">Demo unavailable</h1>
          <p className="text-sm text-white/40 max-w-xs">
            We couldn&apos;t load the demo right now. Please try again in a moment.
          </p>
          <a
            href="/"
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            ← Back to Operion
          </a>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-2xl animate-pulse" />
          <img
            src="/logo.svg"
            alt="Operion"
            className="relative h-16 w-16 animate-in zoom-in duration-500"
          />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Preparing your demo
          </h1>
          <p className="text-sm text-white/40 flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            Loading a sample portfolio
          </p>
        </div>
        <div className="h-0.5 w-32 rounded-full bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-pulse" />
      </div>
    </AuthShell>
  )
}
