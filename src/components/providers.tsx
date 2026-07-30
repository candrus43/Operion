"use client"

import { ThemeProvider } from "next-themes"
import { SessionProvider } from "next-auth/react"
import type { Session } from "next-auth"
import { Toaster } from "@/components/ui/sonner"

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode
  session?: Session | null
}) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        {children}
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  )
}
