import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export const metadata: Metadata = {
  title: "Operion — AI Operations Software for Multi-Business Owners",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const orgId = (session.user as any).organizationId
  if (orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { subscriptionStatus: true },
    })
    if (org?.subscriptionStatus === "EXPIRED") {
      redirect("/trial-expired")
    }
  }

  return <DashboardShell>{children}</DashboardShell>
}
