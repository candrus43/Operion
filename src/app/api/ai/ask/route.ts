import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { applyRateLimit } from "@/lib/rate-limit"
import { generateStructuredAnswer } from "@/lib/ai/engine"
import { loadAiPool, resolveContextRef } from "@/lib/ai/records"
import { getContextSuggestions } from "@/lib/ai/suggestions"
import type { AiContextRef, AiSourceType, AskAiResponse } from "@/lib/ai/types"

const VALID_TYPES: AiSourceType[] = ["entity", "project", "task", "contact", "document", "meeting"]

export async function POST(req: NextRequest) {
  // Rate limit: 10 asks per minute per IP
  const limit = await applyRateLimit(req, { maxRequests: 10, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as { organizationId?: string }).organizationId
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "API key not configured", message: "AI features require an OpenAI API key." },
      { status: 503 }
    )
  }

  let body: { question?: string; context?: AiContextRef | null; history?: { role: "user" | "assistant"; content: string }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const question = (body.question ?? "").trim()
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 })
  }

  // Normalize + validate context ref (type whitelist only; ownership is
  // enforced at resolution time against the org pool).
  let context: AiContextRef | null = null
  if (body.context && VALID_TYPES.includes(body.context.type as AiSourceType) && body.context.id) {
    context = { type: body.context.type as AiSourceType, id: body.context.id }
  }

  const history = Array.isArray(body.history)
    ? body.history.filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    : []

  try {
    const { card, context: resolved } = await generateStructuredAnswer({ orgId, question, context, history })

    // Context-driven suggestion chips follow the resolved context.
    const suggestions = resolved ? getContextSuggestions(resolved.type, resolved.title) : []

    const response: AskAiResponse = { card, context: resolved, suggestions }
    return NextResponse.json(response)
  } catch (error) {
    console.error("AI ask error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
