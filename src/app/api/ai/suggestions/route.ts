import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { applyRateLimit } from "@/lib/rate-limit"
import { loadAiPool, resolveContextRef } from "@/lib/ai/records"
import { getContextSuggestions, GLOBAL_SUGGESTIONS } from "@/lib/ai/suggestions"
import type { AiSourceType } from "@/lib/ai/types"

const VALID_TYPES: AiSourceType[] = ["entity", "project", "task", "contact", "document", "meeting"]

export async function GET(req: NextRequest) {
  // Rate limit: 30/suggestions per minute per IP (cheap, deterministic)
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as { organizationId?: string }).organizationId
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 })
  }

  const url = new URL(req.url)
  const type = url.searchParams.get("type") as AiSourceType | null
  const id = url.searchParams.get("id")

  // No context → global orientation prompts.
  if (!type || !id || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ suggestions: GLOBAL_SUGGESTIONS, context: null })
  }

  // Org-scoped ownership check: only return suggestions for records the user
  // can actually see (foreign/unknown record → treat as no context, never leak).
  try {
    const pool = await loadAiPool(orgId)
    const resolved = resolveContextRef({ type, id }, pool)
    if (!resolved) {
      return NextResponse.json({ suggestions: [], context: null })
    }
    const suggestions = getContextSuggestions(resolved.type, resolved.title)
    return NextResponse.json({ suggestions, context: resolved })
  } catch (error) {
    console.error("AI suggestions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
