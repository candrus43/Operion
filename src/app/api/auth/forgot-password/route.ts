import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email"

// In-memory rate limiting: email -> timestamps of requests
const rateLimitMap = new Map<string, number[]>()

function isRateLimited(email: string): boolean {
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000

  // Clean up old entries
  const timestamps = (rateLimitMap.get(email) || []).filter((t) => t > oneHourAgo)

  if (timestamps.length >= 3) {
    // Still rate-limited — update the map with the cleaned list
    rateLimitMap.set(email, timestamps)
    return true
  }

  // Not rate-limited — add current timestamp
  timestamps.push(now)
  rateLimitMap.set(email, timestamps)
  return false
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "If an account exists, a reset link has been sent" },
        { status: 200 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Rate limit: check before doing any DB work
    if (isRateLimited(normalizedEmail)) {
      // Return same response to not reveal rate-limiting
      return NextResponse.json(
        { message: "If an account exists, a reset link has been sent" },
        { status: 200 }
      )
    }

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
