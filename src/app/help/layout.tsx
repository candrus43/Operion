import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Help & FAQ | Operion — AI Operations Software for Multi-Business Owners",
  description:
    "Answers to common questions about Operion — entities, tasks, deadlines, AI briefings, documents, billing, and team workspaces. Get the help you need fast.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://www.operion.online/help",
  },
}

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}