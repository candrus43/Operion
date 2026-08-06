import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { auth } from "@/lib/auth"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Operion — Your AI Chief of Staff for Every Business You Run",
  description:
    "Operion scans every entity, surfaces risks, and tells you what to do next — so you can run your entire portfolio from one dashboard, without anything falling through the cracks.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "Operion — Your AI Chief of Staff for Every Business You Run",
    description:
      "Operion scans every entity, surfaces risks, and tells you what to do next — so you can run your entire portfolio from one dashboard, without anything falling through the cracks.",
    url: "https://operion.ctonew.app",
    siteName: "Operion",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Operion",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Operion — Your AI Chief of Staff for Every Business You Run",
    description:
      "Operion scans every entity, surfaces risks, and tells you what to do next — so you can run your entire portfolio from one dashboard.",
    images: ["/og-image.png"],
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
  // Keep zoom available for accessibility (WCAG 1.4.4).
  maximumScale: 5,
  userScalable: true,
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
