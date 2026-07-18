import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function parseICS(icsText: string) {
  const events: {
    title: string
    date: string
    location?: string
    description?: string
  }[] = []

  // Split into VEVENT blocks
  const blocks = icsText.split("BEGIN:VEVENT")
  blocks.shift() // remove text before first VEVENT

  for (const block of blocks) {
    const endIndex = block.indexOf("END:VEVENT")
    if (endIndex === -1) continue
    const eventText = block.substring(0, endIndex)

    const event: { title: string; date: string; location?: string; description?: string } = {
      title: "Untitled Event",
      date: new Date().toISOString(),
    }

    // Parse SUMMARY
    const summaryMatch = eventText.match(/^SUMMARY(?:\;.*?)?:(.+)$/m)
    if (summaryMatch) {
      event.title = summaryMatch[1].replace(/\\,/g, ",").replace(/\\n/g, "\n").replace(/\\;/g, ";").trim()
    }

    // Parse DTSTART
    const dtstartMatch = eventText.match(/^DTSTART(?:\;.*?)?:(\d{8}T?\d{6}Z?)/m)
    if (dtstartMatch) {
      let ds = dtstartMatch[1]
      // Format: 20260720T140000Z or 20260720
      const year = ds.substring(0, 4)
      const month = ds.substring(4, 6)
      const day = ds.substring(6, 8)
      if (ds.length >= 15) {
        const hour = ds.substring(9, 11)
        const min = ds.substring(11, 13)
        const sec = ds.substring(13, 15)
        event.date = `${year}-${month}-${day}T${hour}:${min}:${sec}${ds.endsWith("Z") ? "Z" : ""}`
      } else {
        event.date = `${year}-${month}-${day}T00:00:00Z`
      }
    }

    // Parse DTEND (use as additional info)
    const dtendMatch = eventText.match(/^DTEND(?:\;.*?)?:(\d{8}T?\d{6}Z?)/m)
    if (dtendMatch && !event.location) {
      // No location found yet, DTEND not needed
    }

    // Parse LOCATION
    const locationMatch = eventText.match(/^LOCATION(?:\;.*?)?:(.+)$/m)
    if (locationMatch) {
      event.location = locationMatch[1].replace(/\\,/g, ",").replace(/\\n/g, "\n").replace(/\\;/g, ";").trim()
    }

    // Parse DESCRIPTION
    const descMatch = eventText.match(/^DESCRIPTION(?:\;.*?)?:(.+)(?:\r?\n\s.+)*/m)
    if (descMatch) {
      let desc = descMatch[1].replace(/\\,/g, ",").replace(/\\n/g, "\n").replace(/\\;/g, ";").trim()
      event.description = desc
    }

    events.push(event)
  }

  return events
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId

  const body = await req.json()
  const { icsContent } = body as { icsContent: string }

  if (!icsContent || typeof icsContent !== "string") {
    return NextResponse.json({ error: "ICS content is required" }, { status: 400 })
  }

  try {
    const events = parseICS(icsContent)

    if (events.length === 0) {
      return NextResponse.json({ error: "No events found in ICS file" }, { status: 400 })
    }

    const results = { success: 0, failed: 0, errors: [] as { row: number; message: string }[] }

    for (let i = 0; i < events.length; i++) {
      try {
        const evt = events[i]
        await prisma.meeting.create({
          data: {
            title: evt.title,
            date: new Date(evt.date),
            location: evt.location || null,
            notes: evt.description || null,
            organizationId: orgId,
          },
        })
        results.success++
      } catch (err: any) {
        results.failed++
        results.errors.push({ row: i + 1, message: err.message || "Unknown error" })
      }
    }

    return NextResponse.json(results)
  } catch (err: any) {
    console.error("ICS import error:", err)
    return NextResponse.json(
      { error: err.message || "Failed to parse ICS file" },
      { status: 500 }
    )
  }
}
