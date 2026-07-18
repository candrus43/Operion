import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export type Role = "OWNER" | "EXECUTIVE_ASSISTANT" | "OPERATIONS_MANAGER" | "STAFF" | "READ_ONLY"

const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 5,
  EXECUTIVE_ASSISTANT: 4,
  OPERATIONS_MANAGER: 3,
  STAFF: 2,
  READ_ONLY: 1,
}

function getRoleLevel(role?: string | null): number {
  return ROLE_HIERARCHY[(role as Role) || "READ_ONLY"] || 1
}

/** Returns true if the user's role is at least the minRole */
function hasMinRole(userRole: string | undefined | null, minRole: Role): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(minRole)
}

/** Require the user to have one of the allowed roles. Returns a 403 Response or null. */
export async function requireRole(
  ...roles: Role[]
): Promise<{ userId: string; orgId: string; role: string } | NextResponse> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userRole = (session.user as any).role || "STAFF"
  const userId = (session.user as any).id || ""
  const orgId = (session.user as any).organizationId || ""

  if (!roles.some((r) => userRole === r)) {
    // Check hierarchy: higher roles can always do what lower roles can
    const minLevel = Math.min(...roles.map((r) => getRoleLevel(r)))
    if (getRoleLevel(userRole) < minLevel) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  return { userId, orgId, role: userRole }
}

/** Quick check for UI — returns boolean for permissions */
export function canDeleteEntity(role?: string | null): boolean {
  return hasMinRole(role, "EXECUTIVE_ASSISTANT")
}

export function canEditEntity(role?: string | null): boolean {
  return hasMinRole(role, "EXECUTIVE_ASSISTANT")
}

export function canDeleteProject(role?: string | null): boolean {
  return hasMinRole(role, "EXECUTIVE_ASSISTANT")
}

export function canEditProject(role?: string | null): boolean {
  return hasMinRole(role, "OPERATIONS_MANAGER")
}

/** For tasks: OWNER, EA, or task creator */
export function canDeleteTask(role?: string | null, userId?: string, createdById?: string): boolean {
  if (hasMinRole(role, "EXECUTIVE_ASSISTANT")) return true
  if (userId && createdById && userId === createdById) return true
  return false
}

export function canDeleteDocument(role?: string | null, userId?: string, uploadedById?: string): boolean {
  if (hasMinRole(role, "EXECUTIVE_ASSISTANT")) return true
  if (userId && uploadedById && userId === uploadedById) return true
  return false
}

export function canCreateEntity(role?: string | null): boolean {
  return hasMinRole(role, "EXECUTIVE_ASSISTANT")
}

export function canManageUsers(role?: string | null): boolean {
  return hasMinRole(role, "OWNER")
}
