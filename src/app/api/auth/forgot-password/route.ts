import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email"
import { applyRateLimit } from "@/lib/rate-limit"

export async function POST(req: Request) {
  // Rate limit: 3 requests per hour per IP
  const limit = await applyRateLimit(req, { maxRequests: 3, windowMs: 3600000 })
  if (limit) return limit

  try {
    const { email } = await req.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "If an account exists, a reset link has been sent" },
        { status: 200 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Look up user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, resetTokenExpiry: true },
    })

    // If user doesn't exist, return same success message
    if (!user) {
      return NextResponse.json(
        { message: "If an account exists, a reset link has been sent" },
        { status: 200 }
      )
    }

    // If user has an unexpired token, don't generate a new one
    // (rate-limiting is already handled above, but this is another layer)
    if (user.resetTokenExpiry && user.resetTokenExpiry > new Date()) {
      return NextResponse.json(
        { message: "If an account exists, a reset link has been sent" },
        { status: 200 }
      )
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString("hex")
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store token on user
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    })

    // Send email (non-blocking)
    sendPasswordResetEmail(
      { email: user.email, name: user.name || "there" },
      resetToken
    ).catch((err) => {
      console.error("[forgot-password] Failed to send reset email:", err)
    })

    return NextResponse.json(
      { message: "If an account exists, a reset link has been sent" },
      { status: 200 }
    )
  } catch (error) {
    console.error("[forgot-password] Error:", error)
    return NextResponse.json(
      { message: "If an account exists, a reset link has been sent" },
      { status: 200 }
    )
  }
}
