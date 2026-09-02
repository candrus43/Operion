import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { auth } from "@/lib/auth"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  metadataBase: new URL("https://www.operion.online"),
  title: "Operion | AI Operations Software for Multi-Business Owners",
  description:
    "Operion helps business owners manage tasks, deadlines, documents, projects, entities, and follow-ups from one AI-powered operations dashboard.",
  // Favicon uses the light optimized emblem (/icon.png, 22 KB) — the current
  // Operion brand mark (was the old concentric-arcs /icon.svg).
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "Operion | AI Operations Software for Multi-Business Owners",
    description:
      "Operion helps business owners manage tasks, deadlines, documents, projects, entities, and follow-ups from one AI-powered operations dashboard.",
    url: "https://www.operion.online",
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
    title: "Operion | AI Operations Software for Multi-Business Owners",
    description:
      "Operion helps business owners manage tasks, deadlines, documents, projects, entities, and follow-ups from one AI-powered operations dashboard.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://www.operion.online",
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
        {/* Structured data: SoftwareApplication + Organization (canonical host) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Operion",
              url: "https://www.operion.online",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "Operion helps business owners manage tasks, deadlines, documents, projects, entities, and follow-ups from one AI-powered operations dashboard.",
              offers: [
                {
                  "@type": "Offer",
                  name: "Founder",
                  price: "249",
                  priceCurrency: "USD",
                  description: "$249/month with a $2,500 one-time setup fee",
                },
                {
                  "@type": "Offer",
                  name: "Studio",
                  price: "499",
                  priceCurrency: "USD",
                  description: "$499/month with a $5,000 one-time setup fee",
                },
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Operion",
              url: "https://www.operion.online",
              logo: "https://www.operion.online/og-image.png",
            }),
          }}
        />
      </body>
    </html>
  )
}
