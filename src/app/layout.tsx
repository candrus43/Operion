import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { auth } from "@/lib/auth"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Operion — AI Chief of Staff",
  description: "AI-powered executive operating system for multi-entity management",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="en" suppressHydrationWarning data-build="2026-07-18-build" className="overflow-x-hidden">
      <body className={`${inter.variable} font-sans antialiased overflow-x-hidden`}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  )
}
