import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"
import { createTaskEvent } from "@/lib/task-events"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(req: NextRequest) {
  // Rate limit: 10 requests per minute per IP
  const limit = await applyRateLimit(req, { maxRequests: 10, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check for API key
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "API key not configured",
        message: "AI features require an OpenAI API key. Add OPENAI_API_KEY to continue.",
      },
      { status: 503 }
    )
  }

  let body: { taskId: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 })
  }

  const orgId = (session.user as any).organizationId

  const task = await prisma.task.findFirst({
    where: { id: body.taskId, organizationId: orgId },
    include: {
      project: { select: { name: true, status: true, phase: true, progress: true } },
      entity: { select: { name: true, type: true } },
      dependsOn: { select: { id: true, title: true, status: true } },
      assignee: { select: { name: true } },
      comments: { orderBy: { createdAt: "desc" }, take: 3, select: { author: { select: { name: true } }, content: true } },
    },
  })

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  try {
    const systemPrompt = `You are an executive assistant AI. Given a task, provide a concise 2-3 sentence suggestion for the next best action. Be specific and actionable.`

    const userPrompt = `Task: "${task.title}"
Description: ${task.description || "None"}
Status: ${task.status}
Priority: ${task.priority}
${task.dueDate ? `Due: ${task.dueDate.toISOString().split("T")[0]}` : "No due date"}
${task.project ? `Project: ${task.project.name} (${task.project.phase}, ${task.project.progress}% complete)` : "No project"}
${task.entity ? `Entity: ${task.entity.name} (${task.entity.type})` : "No entity"}
${task.dependsOn ? `Depends on: "${task.dependsOn.title}" (${task.dependsOn.status})` : "No dependencies"}
${task.assignee ? `Assignee: ${task.assignee.name}` : "Unassigned"}
${task.comments.length > 0 ? `Recent discussion:\n${task.comments.map((c) => `- ${c.author.name}: ${c.content}`).join("\n")}` : ""}

What's the single most impactful next action for this task? Return 2-3 sentences only.`

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error("OpenAI API error:", errorText)
      return NextResponse.json(
        { error: "AI service error", message: "The AI service returned an error. Please try again." },
        { status: 502 }
      )
    }

    const data = await openaiResponse.json()
    const suggestion = data.choices?.[0]?.message?.content || "Unable to generate suggestion."

    // Save suggestion (cached with generatedAt) so we don't regenerate on every visit
    await prisma.task.update({
      where: { id: task.id },
      data: { aiSuggestion: suggestion, aiSuggestionGeneratedAt: new Date() },
    })

    // Phase 1d: record an AI refresh in the activity feed
    void createTaskEvent({
      taskId: task.id,
      organizationId: orgId,
      actorId: (session.user as any).id ?? null,
      actorName: (session.user as any).name ?? null,
      action: "AI_REFRESH",
    })

    return NextResponse.json({ suggestion, generatedAt: new Date().toISOString() })
  } catch (error) {
    console.error("Suggest task error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
