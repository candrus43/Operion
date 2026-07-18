import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  FolderKanban,
  ChevronRight,
  StickyNote,
} from "lucide-react"
import { cn } from "@/lib/utils"

function groupMeetings(meetings: any[]) {
  const now = new Date()
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() + (7 - now.getDay()))

  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  monthEnd.setHours(23, 59, 59, 999)

  const groups: { label: string; meetings: typeof meetings }[] = [
    { label: "Today", meetings: [] },
    { label: "This Week", meetings: [] },
    { label: "This Month", meetings: [] },
    { label: "Later", meetings: [] },
  ]

  for (const m of meetings) {
    const d = new Date(m.date)
    if (d <= todayEnd) {
      groups[0].meetings.push(m)
    } else if (d <= weekEnd) {
      groups[1].meetings.push(m)
    } else if (d <= monthEnd) {
      groups[2].meetings.push(m)
    } else {
      groups[3].meetings.push(m)
    }
  }

  return groups.filter(g => g.meetings.length > 0)
}

const formatDate = (d: Date) => {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

const formatTime = (d: Date) => {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

export default async function CalendarPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const orgId = (session.user as any).organizationId

  const meetings = await prisma.meeting.findMany({
    where: { organizationId: orgId },
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  })

  const groups = groupMeetings(meetings)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {meetings.length} meeting{meetings.length !== 1 ? "s" : ""} scheduled
          </p>
        </div>
        <Link href="/meetings/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Meeting
          </Button>
        </Link>
      </div>

      {meetings.length === 0 ? (
        <Card className="border-0 bg-[#111111]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-500/10 mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground/80">No meetings scheduled</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Schedule your first meeting to see it here.
            </p>
            <Link href="/meetings/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Meeting
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </h2>
                <div className="h-px flex-1 bg-white/[0.03]" />
                <span className="text-xs text-muted-foreground/50">{group.meetings.length}</span>
              </div>

              <div className="grid gap-3">
                {group.meetings.map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={`/meetings/${meeting.id}/edit`}
                    className="block group"
                  >
                    <Card className="border-0 bg-[#111111] hover:bg-[#141414] transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 min-w-0">
                            {/* Date badge */}
                            <div className="flex flex-col items-center justify-center rounded-xl bg-zinc-500/10 px-3 py-1.5 shrink-0 min-w-[55px]">
                              <span className="text-[10px] text-muted-foreground uppercase">
                                {new Date(meeting.date).toLocaleDateString("en-US", { month: "short" })}
                              </span>
                              <span className="text-lg font-bold">
                                {new Date(meeting.date).getDate()}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-medium group-hover:text-white transition-colors truncate">
                                {meeting.title}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(new Date(meeting.date))}
                                </div>
                                {meeting.location && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate max-w-[160px]">{meeting.location}</span>
                                  </div>
                                )}
                              </div>
                              {meeting.project && (
                                <div className="flex items-center gap-1 mt-1.5">
                                  <FolderKanban className="h-3 w-3 text-muted-foreground/40" />
                                  <span className="text-[11px] text-muted-foreground/50">{meeting.project.name}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-foreground/40 transition-colors shrink-0 mt-2" />
                        </div>

                        {meeting.notes && (
                          <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-white/[0.03]">
                            <StickyNote className="h-3 w-3 text-muted-foreground/40 mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground/60 line-clamp-2">{meeting.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
