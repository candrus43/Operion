import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Support Access | Operion — AI Operations Software for Multi-Business Owners",
  robots: {
    index: false,
    follow: false,
  },
}

export default function SupportAccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}