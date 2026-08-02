import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { auth } from "@/lib/auth"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Operion — AI Chief of Staff for Multi-Entity Portfolio Management",
  description:
    "Run every business you own from one dashboard. Operion uses AI to surface risks, track deadlines, and tell you what needs attention — before you ask.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Operion — AI Chief of Staff for Multi-Entity Management",
    description:
      "Run every business you own from one dashboard. Operion uses AI to surface risks, track deadlines, and tell you what needs attention — before you ask.",
    url: "https://www.operion.online",
    siteName: "Operion",
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: "Operion",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Operion — AI Chief of Staff for Multi-Entity Management",
    description:
      "One dashboard for every business you run. AI-powered briefings, cross-entity search, and white-glove setup.",
    images: ["/icon.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://operion.ctonew.app",
  },
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
