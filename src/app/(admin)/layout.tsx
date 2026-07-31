import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isSuperAdmin = (session.user as any).isSuperAdmin
  if (!isSuperAdmin) {
    const role = (session.user as any).role
    const dest = role === "EXECUTIVE_ASSISTANT" ? "/ea" : "/home"
    redirect(dest)
  }

  const adminEmail = session.user.email || ""

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      <AdminSidebar adminEmail={adminEmail} />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
