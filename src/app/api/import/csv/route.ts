import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id

  const body = await req.json()
  const { type, mappings, data } = body as {
    type: "tasks" | "contacts" | "projects" | "documents" | "entities"
    mappings: Record<string, string>
    data: Record<string, string>[]
  }

  if (!type || !data || !Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ error: "Invalid request. Type and data array required." }, { status: 400 })
  }

  const results = { success: 0, failed: 0, errors: [] as { row: number; message: string }[] }

  try {
    switch (type) {
      case "tasks":
        await importTasks(orgId, userId, mappings, data, results)
        break
      case "contacts":
        await importContacts(orgId, mappings, data, results)
        break
      case "projects":
        await importProjects(orgId, mappings, data, results)
        break
      case "documents":
        await importDocuments(orgId, userId, mappings, data, results)
        break
      case "entities":
        await importEntities(orgId, mappings, data, results)
        break
      default:
        return NextResponse.json({ error: `Unknown import type: ${type}` }, { status: 400 })
    }

    return NextResponse.json(results)
  } catch (err: any) {
    console.error("Import error:", err)
    return NextResponse.json(
      { error: err.message || "Import failed", ...results },
      { status: 500 }
    )
  }
}

async function importTasks(
  orgId: string,
  userId: string,
  mappings: Record<string, string>,
  rows: Record<string, string>[],
  results: { success: number; failed: number; errors: { row: number; message: string }[] }
) {
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i]
      const title = getMapped(row, mappings, "title")
      if (!title) {
        results.failed++
        results.errors.push({ row: i + 1, message: "Title is required" })
        continue
      }

      const dueDateRaw = getMapped(row, mappings, "dueDate")
      const dueDate = dueDateRaw ? new Date(dueDateRaw) : null

      await prisma.task.create({
        data: {
          title,
          description: getMapped(row, mappings, "description") || null,
          status: (getMapped(row, mappings, "status") as any) || "TODO",
          priority: (getMapped(row, mappings, "priority") as any) || "MEDIUM",
          dueDate: dueDate && !isNaN(dueDate.getTime()) ? dueDate : null,
          category: getMapped(row, mappings, "category") || null,
          notes: getMapped(row, mappings, "notes") || null,
          organizationId: orgId,
          projectId: getMapped(row, mappings, "projectId") || null,
          entityId: getMapped(row, mappings, "entityId") || null,
          assigneeId: getMapped(row, mappings, "assigneeId") || null,
          createdById: userId,
        },
      })
      results.success++
    } catch (err: any) {
      results.failed++
      results.errors.push({ row: i + 1, message: err.message || "Unknown error" })
    }
  }
}

async function importContacts(
  orgId: string,
  mappings: Record<string, string>,
  rows: Record<string, string>[],
  results: { success: number; failed: number; errors: { row: number; message: string }[] }
) {
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i]
      const name = getMapped(row, mappings, "name")
      if (!name) {
        results.failed++
        results.errors.push({ row: i + 1, message: "Name is required" })
        continue
      }

      await prisma.contact.create({
        data: {
          name,
          company: getMapped(row, mappings, "company") || null,
          position: getMapped(row, mappings, "position") || null,
          phone: getMapped(row, mappings, "phone") || null,
          email: getMapped(row, mappings, "email") || null,
          notes: getMapped(row, mappings, "notes") || null,
          organizationId: orgId,
          entityId: getMapped(row, mappings, "entityId") || null,
        },
      })
      results.success++
    } catch (err: any) {
      results.failed++
      results.errors.push({ row: i + 1, message: err.message || "Unknown error" })
    }
  }
}

async function importProjects(
  orgId: string,
  mappings: Record<string, string>,
  rows: Record<string, string>[],
  results: { success: number; failed: number; errors: { row: number; message: string }[] }
) {
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i]
      const name = getMapped(row, mappings, "name")
      if (!name) {
        results.failed++
        results.errors.push({ row: i + 1, message: "Name is required" })
        continue
      }

      const startRaw = getMapped(row, mappings, "startDate")
      const targetRaw = getMapped(row, mappings, "targetDate")
      const budgetRaw = getMapped(row, mappings, "budget")

      await prisma.project.create({
        data: {
          name,
          description: getMapped(row, mappings, "description") || null,
          status: (getMapped(row, mappings, "status") as any) || "ACTIVE",
          phase: (getMapped(row, mappings, "phase") as any) || "ACQUISITION",
          progress: parseInt(getMapped(row, mappings, "progress") || "0") || 0,
          budget: budgetRaw ? parseFloat(budgetRaw) : null,
          startDate: startRaw ? new Date(startRaw) : null,
          targetDate: targetRaw ? new Date(targetRaw) : null,
          organizationId: orgId,
          entityId: getMapped(row, mappings, "entityId") || null,
        },
      })
      results.success++
    } catch (err: any) {
      results.failed++
      results.errors.push({ row: i + 1, message: err.message || "Unknown error" })
    }
  }
}

async function importDocuments(
  orgId: string,
  userId: string,
  mappings: Record<string, string>,
  rows: Record<string, string>[],
  results: { success: number; failed: number; errors: { row: number; message: string }[] }
) {
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i]
      const name = getMapped(row, mappings, "name")
      if (!name) {
        results.failed++
        results.errors.push({ row: i + 1, message: "Name is required" })
        continue
      }

      await prisma.document.create({
        data: {
          name,
          type: (getMapped(row, mappings, "type") as any) || "OTHER",
          url: getMapped(row, mappings, "url") || null,
          organizationId: orgId,
          projectId: getMapped(row, mappings, "projectId") || null,
          entityId: getMapped(row, mappings, "entityId") || null,
          uploadedById: userId,
        },
      })
      results.success++
    } catch (err: any) {
      results.failed++
      results.errors.push({ row: i + 1, message: err.message || "Unknown error" })
    }
  }
}

async function importEntities(
  orgId: string,
  mappings: Record<string, string>,
  rows: Record<string, string>[],
  results: { success: number; failed: number; errors: { row: number; message: string }[] }
) {
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i]
      const name = getMapped(row, mappings, "name")
      if (!name) {
        results.failed++
        results.errors.push({ row: i + 1, message: "Name is required" })
        continue
      }

      await prisma.entity.create({
        data: {
          name,
          type: (getMapped(row, mappings, "type") as any) || "OTHER",
          metadata: getMapped(row, mappings, "metadata") || "{}",
          organizationId: orgId,
        },
      })
      results.success++
    } catch (err: any) {
      results.failed++
      results.errors.push({ row: i + 1, message: err.message || "Unknown error" })
    }
  }
}

function getMapped(row: Record<string, string>, mappings: Record<string, string>, field: string): string | undefined {
  const csvColumn = mappings[field]
  if (!csvColumn) return undefined
  return row[csvColumn]?.trim() || undefined
}
