import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"

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
