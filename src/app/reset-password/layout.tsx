import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reset Password | Operion — AI Operations Software for Multi-Business Owners",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}