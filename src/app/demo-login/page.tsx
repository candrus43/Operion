"use client"

import { useEffect, useRef } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "morgan@blackstonepartners.demo"
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "demo123!"

export default function DemoLoginPage() {
  const router = useRouter()
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    async function enter() {
      const result = await signIn("credentials", {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        redirect: false,
      })

      if (!result?.error) {
        router.push("/home")
      } else {
        // If sign-in fails, redirect to home anyway — the demo page
        // will prompt to retry or show the login form as fallback
        router.push("/home")
      }
    }

    // Slight delay so the user sees the transition
    const t = setTimeout(enter, 600)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08080a]">
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
    </div>
  )
}
