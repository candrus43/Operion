import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TeamPage } from "./team-page"

export default async function TeamSettingsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const userRole = (session.user as any).role
  const orgId = (session.user as any).organizationId
  const currentUserId = (session.user as any).id

  // Only OWNER and EXECUTIVE_ASSISTANT can view team page
  if (userRole !== "OWNER" && userRole !== "EXECUTIVE_ASSISTANT") {
    redirect("/settings")
  }

  return (
    <TeamPage
      currentUserId={currentUserId}
      currentUserRole={userRole}
      orgId={orgId}
    />
  )
}
