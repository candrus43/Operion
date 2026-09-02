import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Complete Subscription | Operion — AI Operations Software for Multi-Business Owners",
  robots: {
    index: false,
    follow: false,
  },
}

export default function CompleteSubscriptionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}