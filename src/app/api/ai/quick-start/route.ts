import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// ── Types ────────────────────────────────────────────────────────

interface AIEntity {
  name: string
  type: "BUSINESS" | "HOTEL" | "GAS_STATION" | "COMMERCIAL_PROPERTY" | "INVESTMENT" | "OTHER"
  metadata?: Record<string, string>
}

interface AIContact {
  name: string
  email?: string
  phone?: string
  company?: string
  position?: string
  entityName?: string
  notes?: string
}

interface AIProject {
  name: string
  description?: string
  status?: "ACTIVE" | "ON_HOLD" | "COMPLETED"
  phase?: "ACQUISITION" | "DUE_DILIGENCE" | "DESIGN" | "PERMITTING" | "CONSTRUCTION" | "CLOSEOUT" | "OPERATIONS"
  entityName?: string
}

interface AITask {
  title: string
  description?: string
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  status?: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "WAITING_ON"
  dueDate?: string
  entityName?: string
  projectName?: string
}

interface AIQuickStartResult {
  entities: AIEntity[]
  contacts: AIContact[]
  projects: AIProject[]
  tasks: AITask[]
}

// ── System Prompt ────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI business analyst that extracts structured data from freeform business descriptions.
The user will describe what businesses, properties, and projects they manage.
Your job is to extract every entity, contact, project, and task you can reasonably infer.

Guidelines:
- **Entities** — businesses, hotels, gas stations, commercial properties, investments. Map types: "hotel"→HOTEL, "gas station"→GAS_STATION, "commercial property"/"office"→COMMERCIAL_PROPERTY, "investment"/"portfolio"→INVESTMENT, general businesses→BUSINESS, anything else→OTHER.
- **Contacts** — if the user mentions specific people (employees, contractors, partners), extract them. Only include contacts explicitly mentioned or strongly implied. For each contact, link them to the entity they belong to (entityName field).
- **Projects** — ongoing initiatives the user mentions or implies. Common patterns: renovations, acquisitions, permitting, hiring, launching new services. Infer reasonable projects based on the business types mentioned.
- **Tasks** — actionable items. For each entity, infer 2-4 common operational tasks based on the business type. For hotels: front desk management, guest satisfaction, maintenance, booking optimization. For gas stations: inventory orders, pump maintenance, staff scheduling, compliance checks. For commercial properties: tenant management, lease renewals, maintenance, rent collection.
- If the user mentions dates or deadlines, use them for task due dates.
- Be thorough but reasonable — don't fabricate people or over-invent.

Return ONLY valid JSON matching this exact structure:
{
  "entities": [{ "name": "...", "type": "BUSINESS|HOTEL|GAS_STATION|COMMERCIAL_PROPERTY|INVESTMENT|OTHER", "metadata": {} }],
  "contacts": [{ "name": "...", "email": "...", "phone": "...", "company": "...", "position": "...", "entityName": "...", "notes": "..." }],
  "projects": [{ "name": "...", "description": "...", "status": "ACTIVE|ON_HOLD|COMPLETED", "phase": "ACQUISITION|DUE_DILIGENCE|DESIGN|PERMITTING|CONSTRUCTION|CLOSEOUT|OPERATIONS", "entityName": "..." }],
  "tasks": [{ "title": "...", "description": "...", "priority": "LOW|MEDIUM|HIGH|CRITICAL", "status": "TODO|IN_PROGRESS|DONE|BLOCKED|WAITING_ON", "dueDate": "YYYY-MM-DD", "entityName": "...", "projectName": "..." }]
}

Only include fields that have values. Omit empty fields. Return empty arrays if nothing found.`

// ── POST handler ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate limit: 20 requests per minute per IP
  const limit = await applyRateLimit(req, { maxRequests: 20, windowMs: 60000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id

  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "API key not configured",
        message: "AI features require an OpenAI API key. Add OPENAI_API_KEY to continue.",
      },
      { status: 503 }
    )
  }

  // Parse body
  let body: { description: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.description || typeof body.description !== "string" || !body.description.trim()) {
    return NextResponse.json(
      { error: "Description is required" },
      { status: 400 }
    )
  }

  const description = body.description.trim()

  // Call OpenAI
  let aiResult: AIQuickStartResult

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Extract the business structure from this description:\n\n"${description}"\n\nBe thorough. Infer typical tasks and projects for each entity type.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error("OpenAI API error:", errorText)
      return NextResponse.json(
        { error: "AI processing failed", details: "The AI service returned an error. Please try again." },
        { status: 502 }
      )
    }

    const data = await openaiResponse.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: "AI processing failed", details: "The AI returned an empty response." },
        { status: 500 }
      )
    }

    // Parse the AI's JSON response
    try {
      aiResult = JSON.parse(content) as AIQuickStartResult
    } catch {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        try {
          aiResult = JSON.parse(jsonMatch[1]) as AIQuickStartResult
        } catch {
          return NextResponse.json(
            { error: "AI processing failed", details: "The AI returned an unparseable response." },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { error: "AI processing failed", details: "The AI returned an unparseable response." },
          { status: 500 }
        )
      }
    }

    if (!aiResult.entities) aiResult.entities = []
    if (!aiResult.contacts) aiResult.contacts = []
    if (!aiResult.projects) aiResult.projects = []
    if (!aiResult.tasks) aiResult.tasks = []
  } catch (err: any) {
    console.error("AI call error:", err)
    return NextResponse.json(
      { error: "AI processing failed", details: err.message || "Something went wrong." },
      { status: 500 }
    )
  }

  // ── Create records ─────────────────────────────────────────────
  const createdEntities: { id: string; name: string }[] = []
  const createdProjects: { id: string; name: string }[] = []
  const createdContacts: any[] = []
  const createdTasks: any[] = []
  const errors: string[] = []

  const findEntity = (name?: string) => {
    if (!name) return null
    const lower = name.toLowerCase().trim()
    return createdEntities.find(e => e.name.toLowerCase().trim() === lower) || null
  }

  const findProject = (name?: string) => {
    if (!name) return null
    const lower = name.toLowerCase().trim()
    return createdProjects.find(p => p.name.toLowerCase().trim() === lower) || null
  }

  try {
    // Step 1: Create entities
    for (const entity of aiResult.entities) {
      if (!entity.name?.trim()) continue
      try {
        const validTypes = ["BUSINESS", "HOTEL", "GAS_STATION", "COMMERCIAL_PROPERTY", "INVESTMENT", "OTHER"]
        const entityType = validTypes.includes(entity.type) ? entity.type : "OTHER"

        const created = await prisma.entity.create({
          data: {
            name: entity.name.trim(),
            type: entityType,
            metadata: entity.metadata ? JSON.stringify(entity.metadata) : "{}",
            organizationId: orgId,
          },
        })
        createdEntities.push({ id: created.id, name: created.name })
      } catch (err: any) {
        errors.push(`Entity "${entity.name}": ${err.message}`)
      }
    }

    // Step 2: Create contacts
    for (const contact of aiResult.contacts) {
      if (!contact.name?.trim()) continue
      try {
        const entity = findEntity(contact.entityName)
        const created = await prisma.contact.create({
          data: {
            name: contact.name.trim(),
            email: contact.email?.trim() || null,
            phone: contact.phone?.trim() || null,
            company: contact.company?.trim() || null,
            position: contact.position?.trim() || null,
            notes: contact.notes?.trim() || null,
            organizationId: orgId,
            entityId: entity?.id || null,
          },
        })
        createdContacts.push(created)
      } catch (err: any) {
        errors.push(`Contact "${contact.name}": ${err.message}`)
      }
    }

    // Step 3: Create projects
    for (const project of aiResult.projects) {
      if (!project.name?.trim()) continue
      try {
        const entity = findEntity(project.entityName)
        const validStatuses = ["ACTIVE", "ON_HOLD", "COMPLETED"]
        const validPhases = ["ACQUISITION", "DUE_DILIGENCE", "DESIGN", "PERMITTING", "CONSTRUCTION", "CLOSEOUT", "OPERATIONS"]

        const created = await prisma.project.create({
          data: {
            name: project.name.trim(),
            description: project.description?.trim() || null,
            status: validStatuses.includes(project.status || "") ? project.status : "ACTIVE",
            phase: validPhases.includes(project.phase || "") ? project.phase : "ACQUISITION",
            organizationId: orgId,
            entityId: entity?.id || null,
          },
        })
        createdProjects.push({ id: created.id, name: created.name })
      } catch (err: any) {
        errors.push(`Project "${project.name}": ${err.message}`)
      }
    }

    // Step 4: Create tasks
    for (const task of aiResult.tasks) {
      if (!task.title?.trim()) continue
      try {
        const entity = findEntity(task.entityName)
        const project = findProject(task.projectName)
        const validStatuses = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED", "WAITING_ON"]
        const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

        let dueDate: Date | null = null
        if (task.dueDate) {
          const parsed = new Date(task.dueDate)
          if (!isNaN(parsed.getTime())) dueDate = parsed
        }

        const created = await prisma.task.create({
          data: {
            title: task.title.trim(),
            description: task.description?.trim() || null,
            status: validStatuses.includes(task.status || "") ? task.status : "TODO",
            priority: validPriorities.includes(task.priority || "") ? task.priority : "MEDIUM",
            dueDate,
            organizationId: orgId,
            entityId: entity?.id || null,
            projectId: project?.id || null,
            createdById: userId,
          },
        })
        createdTasks.push(created)
      } catch (err: any) {
        errors.push(`Task "${task.title}": ${err.message}`)
      }
    }
  } catch (err: any) {
    console.error("Database creation error:", err)
    return NextResponse.json(
      {
        error: "Database error",
        details: err.message,
        summary: {
          entities: createdEntities.length,
          contacts: createdContacts.length,
          projects: createdProjects.length,
          tasks: createdTasks.length,
        },
        errors,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    summary: {
      entities: createdEntities.length,
      contacts: createdContacts.length,
      projects: createdProjects.length,
      tasks: createdTasks.length,
    },
    created: {
      entities: createdEntities,
      contacts: createdContacts,
      projects: createdProjects.map(p => ({ id: p.id, name: p.name })),
      tasks: createdTasks.map(t => ({ id: t.id, title: t.title })),
    },
    errors: errors.length > 0 ? errors : undefined,
  })
}
