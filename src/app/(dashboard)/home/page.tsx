import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AIBriefing } from "@/components/dashboard/ai-briefing"
import { StatCard, CriticalTasks, UpcomingDeadlines, ActiveProjects, ActivityFeed, WaitingOn } from "@/components/dashboard/widgets"
import { HealthScore } from "@/components/dashboard/health-score"
import { WelcomeScreen } from "@/components/onboarding/welcome-screen"
import { CheckoutSuccessToast } from "@/components/dashboard/checkout-success-toast"
import { cn } from "@/lib/utils"
import { generateNotifications } from "@/lib/notifications"
import {
  Building2,
  FolderKanban,
  CheckSquare,
  Clock,
  FileText,
  Users,
  Calendar,
} from "lucide-react"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { checkout?: string }
}) {
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

  const userName = session.user.name || "there"

  // Quick counts for stat cards
  // Note: org is fetched inside Promise.all below — trial expiration check comes right after
  const [
    entityCount,
    activeProjectCount,
    openTaskCount,
    waitingOnCount,
    docCount,
    contactCount,
    org,
  ] = await Promise.all([
    prisma.entity.count({ where: { organizationId: orgId } }),
    prisma.project.count({ where: { organizationId: orgId, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    prisma.task.count({ where: { organizationId: orgId, status: { not: "DONE" } } }),
    prisma.task.count({ where: { organizationId: orgId, status: "WAITING_ON" } }),
    prisma.document.count({ where: { organizationId: orgId } }),
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { subscriptionStatus: true, trialEndDate: true, subscriptionTier: true, lastNotificationGeneration: true },
    }),
  ])

  // Enforce trial expiration at page level
  if (org?.subscriptionStatus === "EXPIRED") {
    redirect("/trial-expired")
  }

  // Show guided onboarding if org has no entities yet
  if (entityCount === 0) {
    return <WelcomeScreen userName={userName} />
  }

  // ── Trigger notification generation if it's been > 1 hour ──────
  const shouldGenerateNotifications =
    !org?.lastNotificationGeneration ||
    (Date.now() - org.lastNotificationGeneration.getTime()) > 3600000

  if (shouldGenerateNotifications) {
    // Fire-and-forget: don't block the dashboard render
    void generateNotifications(orgId).catch((err) => {
      console.error("Failed to generate notifications on dashboard load:", err)
    })
  }

  // ── Health Score Calculation ──────────────────────────────────
  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)
  const fourteenDaysAgo = new Date(now)
  fourteenDaysAgo.setDate(now.getDate() - 14)
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const [
    overdueTasks,
    stalledProjectsRaw,
    unassignedOldTasks,
    recentlyCompleted,
    weeklyCompleted,
  ] = await Promise.all([
    // Overdue tasks: past due date, not DONE
    prisma.task.count({
      where: {
        organizationId: orgId,
        dueDate: { lt: now },
        status: { not: "DONE" },
      },
    }),
    // Stalled projects: ACTIVE or ON_HOLD, no task updated/completed in 14 days
    // We check if the project has ANY task with updatedAt > 14 days ago
    prisma.project.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["ACTIVE", "ON_HOLD"] },
      },
      include: {
        tasks: {
          where: {
            updatedAt: { gte: fourteenDaysAgo },
          },
          select: { id: true },
        },
      },
    }),
    // Unassigned tasks > 7 days old
    prisma.task.count({
      where: {
        organizationId: orgId,
        assigneeId: null,
        status: { not: "DONE" },
        createdAt: { lt: sevenDaysAgo },
      },
    }),
    // Tasks completed in last 7 days
    prisma.task.count({
      where: {
        organizationId: orgId,
        status: "DONE",
        updatedAt: { gte: sevenDaysAgo },
      },
    }),
    // Tasks completed this week
    prisma.task.count({
      where: {
        organizationId: orgId,
        status: "DONE",
        updatedAt: { gte: weekStart },
      },
    }),
  ])

  // Calculate stalled projects: those with no recently updated tasks
  const stalledProjectCount = stalledProjectsRaw.filter(p => p.tasks.length === 0).length

  // Compute health score
  let healthScore = 100
  const deductions: string[] = []

  // -5 for each overdue task (max -25)
  const overduePenalty = Math.min(overdueTasks * 5, 25)
  if (overdueTasks > 0) {
    healthScore -= overduePenalty
    deductions.push(`${overdueTasks} overdue task${overdueTasks > 1 ? "s" : ""}`)
  }

  // -5 for each stalled project
  if (stalledProjectCount > 0) {
    healthScore -= stalledProjectCount * 5
    deductions.push(`${stalledProjectCount} stalled project${stalledProjectCount > 1 ? "s" : ""}`)
  }

  // -3 for each unassigned task > 7 days
  if (unassignedOldTasks > 0) {
    healthScore -= unassignedOldTasks * 3
    deductions.push(`${unassignedOldTasks} unassigned task${unassignedOldTasks > 1 ? "s" : ""}`)
  }

  // +2 for each completed task in last 7 days
  if (recentlyCompleted > 0) {
    healthScore += recentlyCompleted * 2
  }

  // Cap at 0-100
  healthScore = Math.max(0, Math.min(100, healthScore))

  // ── Tier / Trial Info ─────────────────────────────────────────
  const tier = org?.subscriptionTier || "SOLO"
  const tierLabel = tier === "ENTERPRISE" ? "Enterprise Plan" : tier === "TEAM" ? "Team Plan" : "Solo Plan"
  const tierBadgeColors: Record<string, string> = {
    SOLO: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    TEAM: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    ENTERPRISE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  }

  // ── Checkout success handling ──────────────────────────────────
  const showCheckoutSuccess = searchParams?.checkout === "success"
  const planName = tier === "TEAM" ? "Team" : "Solo"

  let trialDaysRemaining: number | null = null
  let isTrial = false
  if (org?.subscriptionStatus === "TRIAL" && org?.trialEndDate) {
    isTrial = true
    trialDaysRemaining = Math.ceil(
      (org.trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    if (trialDaysRemaining < 0) trialDaysRemaining = 0
  }

  return (
    <div className="space-y-6">
      {/* Checkout success toast */}
      {showCheckoutSuccess && <CheckoutSuccessToast planName={planName} />}

      {/* Row 1: AI Daily Briefing */}
      <Suspense fallback={
        <div className="rounded-2xl bg-[#111111] border border-white/[0.04] p-6 space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <img src="/logo.svg" alt="Operion" className="h-5 w-5 opacity-60" />
            </div>
            <div>
              <div className="h-5 w-40 bg-[#1e1e1e] rounded" />
              <div className="h-3.5 w-28 bg-[#1e1e1e] rounded mt-1.5" />
            </div>
          </div>
          <div className="h-4 w-3/4 bg-[#1e1e1e] rounded" />
          <div className="h-4 w-2/3 bg-[#1e1e1e] rounded" />
          <div className="h-4 w-1/2 bg-[#1e1e1e] rounded" />
          <div className="flex gap-2 pt-2">
            <div className="h-8 w-24 bg-[#1e1e1e] rounded-full" />
            <div className="h-8 w-20 bg-[#1e1e1e] rounded-full" />
            <div className="h-8 w-28 bg-[#1e1e1e] rounded-full" />
          </div>
        </div>
      }>
        <AIBriefing orgId={orgId} userName={userName} />
      </Suspense>

      {/* Tier badge + entity limit warning */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
          tierBadgeColors[tier]
        )}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {tierLabel}
        </span>
        {tier === "SOLO" && entityCount >= 3 && (
          <div className="flex items-center gap-3 rounded-lg bg-amber-500/5 border border-amber-500/15 px-4 py-2.5 text-sm">
            <span className="text-amber-400">⚠</span>
            <span className="text-amber-300/80">You&apos;ve reached your entity limit.</span>
            <Link
              href="/pricing"
              className="ml-2 shrink-0 text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2"
            >
              Upgrade to add more →
            </Link>
          </div>
        )}
      </div>

      {/* Row 2: Health Score + Stat Cards */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        {/* Health Score takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <HealthScore
            score={healthScore}
            deductions={deductions}
            weeklyCompleted={weeklyCompleted}
          />
        </div>
        {/* Stat cards take remaining 5 columns */}
        <div className="lg:col-span-5 grid gap-4 grid-cols-2 sm:grid-cols-3">
          <StatCard label="Entities" value={entityCount} icon={Building2} accent="text-blue-400" />
          <StatCard label="Active Projects" value={activeProjectCount} icon={FolderKanban} accent="text-emerald-400" />
          <StatCard label="Open Tasks" value={openTaskCount} icon={CheckSquare} accent="text-violet-400" />
          <StatCard label="Waiting On" value={waitingOnCount} icon={Clock} accent="text-amber-400" />
          <StatCard label="Documents" value={docCount} icon={FileText} accent="text-sky-400" />
          <StatCard label="Contacts" value={contactCount} icon={Users} accent="text-rose-400" />
        </div>
        {isTrial && trialDaysRemaining !== null && (
          <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Calendar className="h-3.5 w-3.5" />
              Trial
            </div>
            <div className={cn(
              "text-2xl font-bold",
              trialDaysRemaining <= 3 ? "text-amber-400" : "text-foreground"
            )}>
              {trialDaysRemaining}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {trialDaysRemaining === 1 ? "day left" : "days left"}
            </div>
          </div>
        )}
      </div>

      {/* Row 3: Critical Tasks + Upcoming Deadlines */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={
          <div className="rounded-xl bg-[#111111] p-5 space-y-3">
            <div className="h-5 w-36 bg-[#1a1a1a] rounded animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-[#1a1a1a] rounded-lg animate-pulse" />
            ))}
          </div>
        }>
          <CriticalTasks orgId={orgId} />
        </Suspense>
        <Suspense fallback={
          <div className="rounded-xl bg-[#111111] p-5 space-y-3">
            <div className="h-5 w-36 bg-[#1a1a1a] rounded animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-[#1a1a1a] rounded-lg animate-pulse" />
            ))}
          </div>
        }>
          <UpcomingDeadlines orgId={orgId} />
        </Suspense>
      </div>

      {/* Row 4: Active Projects + Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={
          <div className="rounded-xl bg-[#111111] p-5 space-y-3">
            <div className="h-5 w-36 bg-[#1a1a1a] rounded animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-[#1a1a1a] rounded-lg animate-pulse" />
            ))}
          </div>
        }>
          <ActiveProjects orgId={orgId} />
        </Suspense>
        <Suspense fallback={
          <div className="rounded-xl bg-[#111111] p-5 space-y-3">
            <div className="h-5 w-36 bg-[#1a1a1a] rounded animate-pulse" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-[#1a1a1a] rounded-lg animate-pulse" />
            ))}
          </div>
        }>
          <ActivityFeed orgId={orgId} />
        </Suspense>
      </div>

      {/* Row 5: Waiting On (full width) */}
      <Suspense fallback={
        <div className="rounded-xl bg-[#111111] p-5 space-y-3">
          <div className="h-5 w-44 bg-[#1a1a1a] rounded animate-pulse" />
          <div className="grid gap-2 grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-[#1a1a1a] rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      }>
        <WaitingOn orgId={orgId} />
      </Suspense>
    </div>
  )
}
