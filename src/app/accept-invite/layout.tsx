import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Accept Invite | Operion — AI Operations Software for Multi-Business Owners",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AcceptInviteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}