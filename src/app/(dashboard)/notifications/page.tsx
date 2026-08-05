import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const organizationId = (session.user as any).organizationId
  const notifications = await prisma.notification.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 100 })
  return <div className="space-y-6"><PageHeader title="Notifications" description="Recent alerts and updates across your portfolio." /><div className="space-y-2">{notifications.length ? notifications.map((n) => <div key={n.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><div className="flex justify-between gap-4"><h3 className="font-medium">{n.title}</h3><time className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</time></div><p className="mt-1 text-sm text-muted-foreground">{n.message}</p></div>) : <p className="text-sm text-muted-foreground">No notifications yet.</p>}</div></div>
}
