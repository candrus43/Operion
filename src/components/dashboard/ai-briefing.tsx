import { prisma } from "@/lib/db"
import { cn } from "@/lib/utils"
import {
  Sparkles,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  Zap,
} from "lucide-react"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function getTimeEmoji(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "☀️"
  if (hour < 17) return "🌤️"
  return "🌙"
}

interface BriefingProps {
  orgId: string
  userName: string
}

export async function AIBriefing({ orgId, userName }: BriefingProps) {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const sevenDaysFromNow = new Date(now)
  sevenDaysFromNow.setDate(now.getDate() + 7)

  // Fetch all data in parallel
  const [
    // Active priorities (non-DONE tasks)
    activeTasks,
    // Projects behind schedule (past targetDate, not COMPLETED)
    overdueProjects,
    // WAITING_ON tasks (contracts/items needing signatures)
    waitingOnCount,
    // CRITICAL tasks with approaching deadlines
    criticalApproaching,
    // Overdue tasks
    overdueTasks,
    // Stalled projects
    stalledProjects,
    // Weekly completed tasks (for Sarah the EA)
    weeklyCompletedByEA,
    // Top 3 focus items
    focusItems,
    // Entity count
    entityCount,
    // Total open tasks
    openTasksCount,
    // Document count
    docCount,
    // Contact count
    contactCount,
  ] = await Promise.all([
    prisma.task.count({
      where: {
        organizationId: orgId,
        status: { notIn: ["DONE"] },
      },
    }),
    prisma.project.count({
      where: {
        organizationId: orgId,
        targetDate: { lt: now },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
    }),
    prisma.task.count({
      where: {
        organizationId: orgId,
        status: "WAITING_ON",
      },
    }),
    prisma.task.findMany({
      where: {
        organizationId: orgId,
        priority: "CRITICAL",
        status: { not: "DONE" },
        dueDate: { lte: sevenDaysFromNow },
      },
      include: { project: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.task.findMany({
      where: {
        organizationId: orgId,
        status: { notIn: ["DONE"] },
        dueDate: { lt: now },
      },
      orderBy: { dueDate: "asc" },
      take: 3,
    }),
    prisma.project.findMany({
      where: {
        organizationId: orgId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        progress: { lte: 30 },
        startDate: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      take: 3,
    }),
    prisma.task.count({
      where: {
        organizationId: orgId,
        status: "DONE",
        updatedAt: { gte: weekStart, lt: weekEnd },
        assignee: { role: "EXECUTIVE_ASSISTANT" },
      },
    }),
    prisma.task.findMany({
      where: {
        organizationId: orgId,
        status: { notIn: ["DONE"] },
        OR: [
          { priority: "CRITICAL" },
          { priority: "HIGH", dueDate: { lte: sevenDaysFromNow } },
        ],
      },
      include: { project: true, entity: true },
      orderBy: [
        { priority: "asc" }, // CRITICAL before HIGH
        { dueDate: "asc" },
      ],
      take: 3,
    }),
    prisma.entity.count({ where: { organizationId: orgId } }),
    prisma.task.count({
      where: { organizationId: orgId, status: { not: "DONE" } },
    }),
    prisma.document.count({ where: { organizationId: orgId } }),
    prisma.contact.count({ where: { organizationId: orgId } }),
  ])

  const firstName = userName?.split(" ")[0] || "there"

  // Determine key alerts
  const alerts: string[] = []
  if (overdueTasks.length > 0) {
    alerts.push(`${overdueTasks.length} task${overdueTasks.length > 1 ? "s" : ""} past due date`)
  }
  if (overdueProjects > 0) {
    alerts.push(`${overdueProjects} project${overdueProjects > 1 ? "s" : ""} behind schedule`)
  }
  if (stalledProjects.length > 0) {
    alerts.push(`${stalledProjects.length} project${stalledProjects.length > 1 ? "s" : ""} stalled`)
  }
  if (criticalApproaching.length > 0) {
    alerts.push(`${criticalApproaching.length} critical ${criticalApproaching.length > 1 ? "items" : "item"} due soon`)
  }
  if (overdueTasks.length === 0 && overdueProjects === 0 && criticalApproaching.length === 0) {
    alerts.push("Nothing urgent — your portfolio is in great shape")
  }

  // Priority ordering: CRITICAL=0, HIGH=1, MEDIUM=2, LOW=3
  const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.04] bg-gradient-to-br from-[#111111] via-[#151518] to-[#111122] p-6 md:p-8">
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] via-transparent to-blue-500/[0.03]" />
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-amber-500/[0.04] blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-blue-500/[0.04] blur-3xl" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
            <Sparkles className="h-4.5 w-4.5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              <span className="text-amber-400">{getTimeEmoji()}</span>{" "}
              {getGreeting()}, <span className="text-white">{firstName}</span>
            </h2>
            <p className="text-xs text-muted-foreground/80 mt-0.5">
              Your AI briefing for {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Main Briefing Content */}
        <div className="space-y-4">
          {/* Stats Summary */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
            <p className="text-sm leading-relaxed text-foreground/90">
              You have{" "}
              <span className="font-semibold text-white">{activeTasks} active priorities</span>
              {" "}today across{" "}
              <span className="font-semibold text-white">{entityCount} entities</span>.
              {overdueProjects > 0 && (
                <>{" "}<span className="font-semibold text-red-400">{overdueProjects} project{overdueProjects > 1 ? "s are" : " is"} behind schedule</span>.</>
              )}
              {waitingOnCount > 0 && (
                <>{" "}<span className="font-semibold text-amber-400">{waitingOnCount} {waitingOnCount > 1 ? "items" : "item"} waiting on others</span>.</>
              )}
              {overdueProjects === 0 && waitingOnCount === 0 && " Everything is on track."}
            </p>
          </div>

          {/* Alerts */}
          <div className="grid gap-2 sm:grid-cols-2">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
                  alert.includes("past due") || alert.includes("behind")
                    ? "bg-red-500/5 text-red-400 border border-red-500/10"
                    : alert.includes("stalled")
                    ? "bg-orange-500/5 text-orange-400 border border-orange-500/10"
                    : alert.includes("Nothing")
                    ? "bg-emerald-500/5 text-emerald-400 border border-emerald-500/10"
                    : "bg-amber-500/5 text-amber-400 border border-amber-500/10"
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{alert}</span>
              </div>
            ))}
          </div>

          {/* Recommended Focus */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
              <Zap className="h-3 w-3" />
              Recommended Focus
            </h3>
            <div className="space-y-1.5">
              {focusItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">
                  No urgent items — use this time to plan ahead.
                </p>
              ) : (
                focusItems.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors px-3 py-2 group cursor-pointer"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-foreground/5 text-[10px] font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-white transition-colors">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.project && (
                          <span className="text-[11px] text-muted-foreground/70 truncate">
                            {item.project.name}
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-[10px] font-medium uppercase tracking-wider",
                            item.priority === "CRITICAL"
                              ? "text-red-400"
                              : item.priority === "HIGH"
                              ? "text-amber-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {item.priority}
                        </span>
                        {item.dueDate && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                            <Calendar className="h-2.5 w-2.5" />
                            {item.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-foreground/50 transition-colors shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Weekly Summary Footer */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground/60 pt-2 border-t border-white/[0.03]">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span className="font-medium text-foreground/60">{weeklyCompletedByEA}</span> tasks completed by EA this week
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="font-medium text-foreground/60">{openTasksCount}</span> open tasks
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span>
              <span className="font-medium text-foreground/60">{docCount}</span> documents ·{" "}
              <span className="font-medium text-foreground/60">{contactCount}</span> contacts
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
