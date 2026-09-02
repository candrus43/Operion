import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Operion — AI Operations Software for Multi-Business Owners",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}