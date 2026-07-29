import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST() {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        googleRefreshToken: null,
        googleAccessToken: null,
        googleTokenExpiry: null,
        googleConnected: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Failed to disconnect Google:", e)
    return NextResponse.json(
      { error: "Failed to disconnect Google account" },
      { status: 500 }
    )
  }
}
