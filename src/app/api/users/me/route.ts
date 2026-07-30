import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { compare, hash } from "bcryptjs"
import { applyRateLimit } from "@/lib/rate-limit"

export async function PATCH(req: NextRequest) {
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id
  const orgId = (session.user as any).organizationId

  if (!userId) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }

  const body = await req.json()
  const { name, email, currentPassword, newPassword } = body

  // Fetch the current user with passwordHash
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Build update data
  const updateData: Record<string, any> = {}
  const changes: string[] = []

  // --- Name ---
  if (name !== undefined) {
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    if (name.trim() !== user.name) {
      updateData.name = name.trim()
      changes.push(`name: "${user.name}" → "${name.trim()}"`)
    }
  }

  // --- Email ---
  if (email !== undefined) {
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Check uniqueness (exclude current user)
    const existing = await prisma.user.findFirst({
      where: { email: trimmedEmail, id: { not: userId } },
    })
    if (existing) {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 })
    }

    if (trimmedEmail !== user.email) {
      updateData.email = trimmedEmail
      changes.push(`email: "${user.email}" → "${trimmedEmail}"`)
    }
  }

  // --- Password ---
  if (newPassword !== undefined && newPassword !== "") {
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      )
    }

    if (user.passwordHash) {
      // Password user: require currentPassword
      if (!currentPassword || typeof currentPassword !== "string") {
        return NextResponse.json(
          { error: "Current password is required to change your password" },
          { status: 400 }
        )
      }

      const isValid = await compare(currentPassword, user.passwordHash)
      if (!isValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        )
      }
    }
    // OAuth-only user (null passwordHash): can set a password without currentPassword

    updateData.passwordHash = await hash(newPassword, 12)
    changes.push("password updated")
  }

  // If nothing to update
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      },
      { status: 200 }
    )
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
    },
  })

  // Create audit log
  if (orgId) {
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: "UPDATE",
        entity: "User",
        entityId: userId,
        details: JSON.stringify({
          changedBy: session.user.name || userId,
          changes: changes.join("; "),
        }),
      },
    })
  }

  return NextResponse.json(updatedUser)
}
