import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import * as XLSX from "xlsx"
import { applyRateLimit } from "@/lib/rate-limit"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const MAX_PREVIEW_ROWS = 50

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

interface AIImportResult {
  entities: AIEntity[]
  contacts: AIContact[]
  projects: AIProject[]
  tasks: AITask[]
}

// ── Helpers ──────────────────────────────────────────────────────

function parseSpreadsheet(buffer: ArrayBuffer, fileName: string): Record<string, Record<string, string>[]> {
  const data = new Uint8Array(buffer)
  const workbook = XLSX.read(data, { type: "array" })
  const sheets: Record<string, Record<string, string>[]> = {}

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" })
    if (json.length > 0) {
      sheets[sheetName] = json
    }
  }

  return sheets
}

function buildAIPrompt(fileData: { fileName: string; sheets: Record<string, Record<string, string>[]> }[]): string {
  let prompt = "Analyze the following spreadsheet data and extract structured business information.\n\n"

  for (const file of fileData) {
    prompt += `=== File: ${file.fileName} ===\n`

    for (const [sheetName, rows] of Object.entries(file.sheets)) {
      const headers = rows.length > 0 ? Object.keys(rows[0]) : []
      const previewRows = rows.slice(0, MAX_PREVIEW_ROWS)

      prompt += `\n--- Sheet: ${sheetName} (${rows.length} total rows, showing ${previewRows.length}) ---\n`
      prompt += `Columns: ${headers.join(", ")}\n`
      prompt += "Data:\n"

      for (let i = 0; i < previewRows.length; i++) {
        const row = previewRows[i]
        const rowStr = headers.map(h => `${h}: "${row[h] || ""}"`).join(" | ")
        prompt += `  Row ${i + 1}: ${rowStr}\n`
      }
    }
  }

  prompt += `
Based on the data above, identify and extract the following:

1. **Entities** — businesses, properties, hotels, gas stations, or other organizational units. Look for things like company names, property names, or business units.
2. **Contacts** — people with names, emails, phones, companies, and positions.
3. **Projects** — named initiatives with phases, statuses, and associated entities.
4. **Tasks** — actionable items with priorities, statuses, due dates, and links to projects/entities.

Be smart about inference:
- Column names may vary — use semantic understanding to map them
- If a column contains "due date", "deadline", or date-like strings, those are likely task due dates
- If a column mentions company/organization/business, it likely links to an entity
- Group related rows under the same entity/project when the name matches
- Only include records that have at least a name/title
- Status fields that look like "done"/"complete"/"finished" map to COMPLETED/DONE
- Status fields like "in progress"/"working" map to IN_PROGRESS/ACTIVE
- Priority fields: "urgent"/"critical" → CRITICAL, "high" → HIGH, etc.

Return ONLY valid JSON — no markdown, no explanation. The JSON must match this exact structure:
{
  "entities": [{ "name": "...", "type": "BUSINESS|HOTEL|GAS_STATION|COMMERCIAL_PROPERTY|INVESTMENT|OTHER", "metadata": {} }],
  "contacts": [{ "name": "...", "email": "...", "phone": "...", "company": "...", "position": "...", "entityName": "...", "notes": "..." }],
  "projects": [{ "name": "...", "description": "...", "status": "ACTIVE|ON_HOLD|COMPLETED", "phase": "ACQUISITION|DUE_DILIGENCE|DESIGN|PERMITTING|CONSTRUCTION|CLOSEOUT|OPERATIONS", "entityName": "..." }],
  "tasks": [{ "title": "...", "description": "...", "priority": "LOW|MEDIUM|HIGH|CRITICAL", "status": "TODO|IN_PROGRESS|DONE|BLOCKED|WAITING_ON", "dueDate": "YYYY-MM-DD", "entityName": "...", "projectName": "..." }]
}

Only include fields that have values. Omit empty/optional fields entirely. If no records of a type are found, return an empty array.`
  return prompt
}

// ── POST handler ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate limit: 10 requests per minute per IP
  const limit = await applyRateLimit(req, { maxRequests: 10, windowMs: 60000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id

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

  // Parse multipart form
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const files: File[] = []
  for (const [_, value] of formData.entries()) {
    if (value instanceof File) {
      files.push(value)
    }
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
  }

  // Validate file types
  const allowedExts = [".xlsx", ".xls", ".csv"]
  for (const file of files) {
    const ext = "." + file.name.split(".").pop()?.toLowerCase()
    if (!allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.name}. Only .xlsx, .xls, and .csv files are accepted.` },
        { status: 400 }
      )
    }
  }

  // Parse all files
  const fileData: { fileName: string; sheets: Record<string, Record<string, string>[]> }[] = []

  try {
    for (const file of files) {
      const buffer = await file.arrayBuffer()
      const sheets = parseSpreadsheet(buffer, file.name)
      if (Object.keys(sheets).length === 0) {
        return NextResponse.json(
          { error: `No data found in file: ${file.name}` },
          { status: 400 }
        )
      }
      fileData.push({ fileName: file.name, sheets })
    }
  } catch (err: any) {
    console.error("File parsing error:", err)
    return NextResponse.json(
      { error: "Failed to parse file", details: err.message || "Unknown parsing error" },
      { status: 400 }
    )
  }

  // Call OpenAI
  let aiResult: AIImportResult

  try {
    const systemPrompt = `You are an AI data analyst that extracts structured business information from spreadsheets.
You understand that column names vary — use semantic understanding to map columns to the right fields.
Be thorough: extract every record you can find. Only skip truly empty or meaningless rows.
Return ONLY valid JSON. No markdown, no explanations, no code fences.`

    const userPrompt = buildAIPrompt(fileData)

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
      aiResult = JSON.parse(content) as AIImportResult
    } catch {
      // Try to extract JSON from markdown code fences
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        try {
          aiResult = JSON.parse(jsonMatch[1]) as AIImportResult
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

    // Validate structure
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

  // ── Create records in database ─────────────────────────────────
  const createdEntities: { id: string; name: string }[] = []
  const createdProjects: { id: string; name: string }[] = []
  const createdContacts: any[] = []
  const createdTasks: any[] = []
  const errors: string[] = []

  // Helper to find entity by name (case-insensitive)
  const findEntity = (name?: string) => {
    if (!name) return null
    const lowerName = name.toLowerCase().trim()
    return createdEntities.find(e => e.name.toLowerCase().trim() === lowerName) || null
  }

  // Helper to find project by name (case-insensitive)
  const findProject = (name?: string) => {
    if (!name) return null
    const lowerName = name.toLowerCase().trim()
    return createdProjects.find(p => p.name.toLowerCase().trim() === lowerName) || null
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
          if (!isNaN(parsed.getTime())) {
            dueDate = parsed
          }
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

  // ── Return success ─────────────────────────────────────────────

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
