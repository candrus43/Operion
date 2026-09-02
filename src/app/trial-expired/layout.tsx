import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Trial Expired | Operion — AI Operations Software for Multi-Business Owners",
  robots: {
    index: false,
    follow: false,
  },
}

export default function TrialExpiredLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}