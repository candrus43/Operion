import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateNotifications } from "@/lib/notifications"

export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId

  const count = await generateNotifications(orgId)
  return NextResponse.json({ created: count })
}
