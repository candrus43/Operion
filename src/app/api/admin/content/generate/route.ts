import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!(session.user as any).isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 503 })
  }

  let body: { topic: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.topic || typeof body.topic !== "string" || !body.topic.trim()) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 })
  }

  const topic = body.topic.trim()

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a LinkedIn content strategist for a B2B SaaS product called Operion — an AI Chief of Staff platform for entrepreneurs who manage multiple businesses, properties, and investments.

Write a LinkedIn post based on the user's topic. Follow these guidelines:
- Hook in the first line — start with a question, bold statement, or counterintuitive insight
- Keep paragraphs short (1-2 sentences max)
- Use line breaks generously for readability
- Professional but conversational tone
- End with a clear takeaway or call to action
- Include relevant hashtags (3-5 max)
- Length: 150-300 words

Also generate a catchy title for the post (used internally for the content calendar).

Return ONLY valid JSON:
{ "title": "Catchy internal title", "body": "Full LinkedIn post text..." }`,
          },
          {
            role: "user",
            content: `Topic: "${topic}"`,
          },
        ],
        temperature: 0.8,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("OpenAI content gen error:", err)
      return NextResponse.json({ error: "AI generation failed" }, { status: 502 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 })
    }

    try {
      const result = JSON.parse(content)
      return NextResponse.json({
        title: result.title || topic,
        body: result.body || content,
      })
    } catch {
      return NextResponse.json({
        title: topic,
        body: content,
      })
    }
  } catch (err: any) {
    console.error("Content gen error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
