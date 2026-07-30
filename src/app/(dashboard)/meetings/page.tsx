import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, MapPin, FolderKanban } from "lucide-react"

export default async function MeetingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const orgId = (session.user as any).organizationId
  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No organization found.</p>
      </div>
    )
  }

  const meetings = await prisma.meeting.findMany({
    where: { organizationId: orgId },
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  })

  const upcoming = meetings.filter((m) => new Date(m.date) >= new Date())
  const past = meetings.filter((m) => new Date(m.date) < new Date())

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground mt-1">
            {meetings.length} {meetings.length === 1 ? "meeting" : "meetings"} scheduled
          </p>
        </div>
        <Link href="/meetings/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Meeting
          </Button>
        </Link>
      </div>

      {meetings.length === 0 ? (
        <Card className="border-[#262626] bg-[#111111]">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
              <Calendar className="h-7 w-7 text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-white">No meetings yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Schedule your first meeting to get started.
              </p>
            </div>
            <Link href="/meetings/new">
              <Button variant="outline" className="border-[#262626] bg-[#1a1a1a] hover:bg-[#222] gap-2">
                <Plus className="h-4 w-4" />
                Schedule Meeting
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  Upcoming
                </Badge>
                <span className="text-sm text-muted-foreground font-normal">
                  {upcoming.length} {upcoming.length === 1 ? "meeting" : "meetings"}
                </span>
              </h2>
              <div className="grid gap-3">
                {upcoming.map((meeting) => (
                  <Link key={meeting.id} href={`/meetings/${meeting.id}/edit`}>
                    <Card className="border-[#262626] bg-[#111111] hover:bg-[#1a1a1a] transition-colors cursor-pointer group">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                          <Calendar className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
                            {meeting.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(meeting.date)}
                            </span>
                            {meeting.location && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {meeting.location}
                              </span>
                            )}
                            {meeting.project && (
                              <span className="text-xs text-blue-400 flex items-center gap-1">
                                <FolderKanban className="h-3 w-3" />
                                {meeting.project.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Badge variant="outline" className="border-neutral-500/30 bg-neutral-500/10 text-neutral-400">
                  Past
                </Badge>
                <span className="text-sm text-muted-foreground font-normal">
                  {past.length} {past.length === 1 ? "meeting" : "meetings"}
                </span>
              </h2>
              <div className="grid gap-3">
                {past.map((meeting) => (
                  <Link key={meeting.id} href={`/meetings/${meeting.id}/edit`}>
                    <Card className="border-[#262626] bg-[#111111] hover:bg-[#1a1a1a] transition-colors cursor-pointer group opacity-60 hover:opacity-80">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-500/10">
                          <Calendar className="h-5 w-5 text-neutral-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {meeting.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(meeting.date)}
                            </span>
                            {meeting.location && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {meeting.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
