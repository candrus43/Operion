import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

async function buildSystemPrompt(orgId: string): Promise<string> {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [
    org,
    entities,
    activeProjects,
    openTasks,
    criticalTasks,
    waitingOnCount,
    upcomingDeadlines,
    behindSchedule,
    stalledProjects,
  ] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
    prisma.entity.findMany({
      where: { organizationId: orgId },
      select: { name: true, type: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { organizationId: orgId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      select: { name: true, phase: true, progress: true, status: true, targetDate: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.count({
      where: { organizationId: orgId, status: { not: "DONE" } },
    }),
    prisma.task.count({
      where: { organizationId: orgId, priority: "CRITICAL", status: { not: "DONE" } },
    }),
    prisma.task.count({
      where: { organizationId: orgId, status: "WAITING_ON" },
    }),
    prisma.task.findMany({
      where: {
        organizationId: orgId,
        status: { not: "DONE" },
        dueDate: { lte: sevenDaysFromNow, not: null },
      },
      select: { title: true, dueDate: true, priority: true, project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.project.findMany({
      where: {
        organizationId: orgId,
        targetDate: { lt: now },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      select: { name: true, targetDate: true, progress: true },
      orderBy: { targetDate: "asc" },
    }),
    prisma.project.findMany({
      where: {
        organizationId: orgId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        progress: { lte: 30 },
        startDate: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { name: true, progress: true, startDate: true },
      take: 3,
    }),
  ])

  const orgName = org?.name || "Your Organization"

  const entityList = entities.length > 0
    ? entities.map(e => `- ${e.name} (${e.type.replace(/_/g, " ")})`).join("\n")
    : "No entities yet"

  const projectList = activeProjects.length > 0
    ? activeProjects.map(p =>
        `- ${p.name} — Phase: ${p.phase}, Progress: ${p.progress}%, Status: ${p.status}${p.targetDate ? `, Target: ${p.targetDate.toISOString().split("T")[0]}` : ""}`
      ).join("\n")
    : "No active projects"

  const deadlineList = upcomingDeadlines.length > 0
    ? upcomingDeadlines.map(d =>
        `- ${d.title} (${d.priority}) — Due: ${d.dueDate!.toISOString().split("T")[0]}${d.project ? ` [${d.project.name}]` : ""}`
      ).join("\n")
    : "No upcoming deadlines"

  const behindList = behindSchedule.length > 0
    ? behindSchedule.map(p =>
        `- ${p.name} — Progress: ${p.progress}%, Target: ${p.targetDate!.toISOString().split("T")[0]}`
      ).join("\n")
    : "None"

  const stalledList = stalledProjects.length > 0
    ? stalledProjects.map(p =>
        `- ${p.name} — Progress: ${p.progress}%, Started: ${p.startDate!.toISOString().split("T")[0]}`
      ).join("\n")
    : "None"

  return `You are Operion AI, an executive assistant for ${orgName}.

Current portfolio summary:
- ${entities.length} entities: 
${entityList}
- ${activeProjects.length} active projects:
${projectList}
- ${openTasks} open tasks (${criticalTasks} critical, ${waitingOnCount} waiting)
- Upcoming deadlines:
${deadlineList}
- Projects behind schedule:
${behindList}
- Stalled projects:
${stalledList}

Help the executive prioritize, identify risks, and make decisions. Be concise but thorough. Use the data above to provide specific, actionable advice. Mention entity and project names when relevant. If asked about something not in the data, be transparent about what you know vs. what would need more research.`
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const orgId = (session.user as any).organizationId

  // Check for API key
  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "API key not configured",
        message: "AI features require an OpenAI API key. Add OPENAI_API_KEY to continue.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  let body: { messages: { role: string; content: string }[] }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return new Response(JSON.stringify({ error: "messages array is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const systemPrompt = await buildSystemPrompt(orgId)

    const messages = [
      { role: "system", content: systemPrompt },
      ...body.messages,
    ]

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error("OpenAI API error:", errorText)
      return new Response(
        JSON.stringify({ error: "AI service error", message: "The AI service returned an error. Please try again." }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Stream the response as SSE
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const reader = openaiResponse.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed) continue
              if (trimmed === "data: [DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"))
                continue
              }
              if (trimmed.startsWith("data: ")) {
                controller.enqueue(encoder.encode(trimmed + "\n\n"))
              }
            }
          }

          // Process remaining buffer
          if (buffer.trim()) {
            const trimmed = buffer.trim()
            if (trimmed === "data: [DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            } else if (trimmed.startsWith("data: ")) {
              controller.enqueue(encoder.encode(trimmed + "\n\n"))
            }
          }
        } catch (err) {
          console.error("Stream error:", err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error", message: "Something went wrong. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
