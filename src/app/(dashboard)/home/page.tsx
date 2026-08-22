import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { AIBriefingAI } from "@/components/dashboard/ai-briefing-ai"
import { StatCard, CriticalTasks, UpcomingDeadlines, ActiveProjects, ActivityFeed, WaitingOn } from "@/components/dashboard/widgets"
import { WelcomeScreen } from "@/components/onboarding/welcome-screen"
import { PostPaymentOnboarding } from "@/components/onboarding/PostPaymentOnboarding"
import { CheckoutSuccessToast } from "@/components/dashboard/checkout-success-toast"
import { cn } from "@/lib/utils"
import { generateNotifications } from "@/lib/notifications"
import { computeAggregateSignificance, type AggregateSignificance } from "@/lib/aggregate-significance"
import { TIER_LIMITS } from "@/lib/tier-limits"
import {
  Building2,
  FolderKanban,
  CheckSquare,
  Clock,
  FileText,
  Users,
  Calendar,
  Activity,
} from "lucide-react"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const searchParamsValue = await searchParams
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
  const userId = (session.user as any).id
  const userRole = (session.user as any).role || ""

  // Quick counts for stat cards
  // Note: org is fetched inside Promise.all below — trial expiration check comes right after
  let entityCount = 0, activeProjectCount = 0, openTaskCount = 0, waitingOnCount = 0, docCount = 0, contactCount = 0, overdueTaskCount = 0, blockedTaskCount = 0
  let org: { subscriptionStatus: string; trialEndDate: Date | null; subscriptionTier: string; lastNotificationGeneration: Date | null } | null = null
  let awaitingReviewTasks: any[] = []

  try {
    const result = await Promise.all([
      prisma.entity.count({ where: { organizationId: orgId } }),
      prisma.project.count({ where: { organizationId: orgId, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
      prisma.task.count({ where: { organizationId: orgId, status: { not: "DONE" } } }),
      prisma.task.count({ where: { organizationId: orgId, status: "WAITING_ON" } }),
      prisma.task.count({ where: { organizationId: orgId, dueDate: { lt: new Date() }, status: { not: "DONE" } } }),
      prisma.task.count({ where: { organizationId: orgId, status: "BLOCKED" } }),
      prisma.document.count({ where: { organizationId: orgId } }),
      prisma.contact.count({ where: { organizationId: orgId } }),
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { subscriptionStatus: true, trialEndDate: true, subscriptionTier: true, lastNotificationGeneration: true },
      }),
      prisma.task.findMany({
        where: {
          organizationId: orgId,
          status: "READY_FOR_REVIEW",
          ...(userRole !== "OWNER" ? { createdById: userId } : {}),
        },
        include: {
          assignee: { select: { id: true, name: true } },
          entity: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
    ]);
    [
      entityCount,
      activeProjectCount,
      openTaskCount,
      waitingOnCount,
      overdueTaskCount,
      blockedTaskCount,
      docCount,
      contactCount,
      org,
      awaitingReviewTasks,
    ] = result
  } catch (err) {
    console.error("Dashboard stats fetch failed:", err)
  }

  // Cross-product aggregate significance — what the counts MEAN, org-scoped.
  let significance: AggregateSignificance | null = null
  if (entityCount > 0) {
    try {
      significance = await computeAggregateSignificance(orgId)
    } catch (err) {
      console.error("Dashboard significance fetch failed:", err)
    }
  }

  // Enforce trial expiration at page level
  if (org?.subscriptionStatus === "EXPIRED") {
    redirect("/trial-expired")
  }

  // Show post-payment onboarding if org is ACTIVE but has no entities
  if (entityCount === 0 && org?.subscriptionStatus === "ACTIVE") {
    return <PostPaymentOnboarding userName={userName} />
  }

  // Show guided onboarding if org has no entities yet (trial state)
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

  // ── Tier / Trial Info ─────────────────────────────────────────
  const tier = org?.subscriptionTier || "SOLO"
  const tierLabel = tier === "ENTERPRISE" ? "Enterprise Plan" : tier === "TEAM" ? "Studio Plan" : "Founder Plan"
  const tierBadgeColors: Record<string, string> = {
    SOLO: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    TEAM: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    ENTERPRISE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  }

  // Significance sentence tone styling (dark-on-glass, AA-visible).
  const significanceToneText: Record<string, string> = {
    critical: "text-rose-300",
    warn: "text-amber-300",
    good: "text-emerald-300",
  }
  const significanceToneDot: Record<string, string> = {
    critical: "bg-rose-500",
    warn: "bg-amber-500",
    good: "bg-emerald-500",
  }

  // ── Checkout success handling ──────────────────────────────────
  const showCheckoutSuccess = searchParamsValue.checkout === "success"
  const planName = tier === "TEAM" ? "Studio" : "Founder"

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
      <AIBriefingAI userName={userName} />

      {/* Cross-product significance — what the portfolio counts MEAN. */}
      {significance && significance.sentences.length > 0 && (
        <div className="rounded-xl glass border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06]">
              <Activity className="h-3.5 w-3.5 text-white/70" />
            </div>
            <h2 className="text-sm font-semibold">Significance</h2>
            <p className="text-xs text-muted-foreground ml-1">what needs your attention right now</p>
          </div>
          <ul className="space-y-2">
            {significance.sentences.map((s, i) => (
              <li key={i}>
                {s.href ? (
                  <Link
                    href={s.href}
                    className={cn(
                      "flex items-start gap-2 text-sm leading-relaxed hover:underline",
                      significanceToneText[s.tone] ?? "text-white/70"
                    )}
                  >
                    <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", significanceToneDot[s.tone] ?? "bg-white/40")} />
                    {s.text}
                  </Link>
                ) : (
                  <span className={cn("flex items-start gap-2 text-sm leading-relaxed", significanceToneText[s.tone] ?? "text-white/70")}>
                    <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", significanceToneDot[s.tone] ?? "bg-white/40")} />
                    {s.text}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tier badge + entity limit warning */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
          tierBadgeColors[tier]
        )}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {tierLabel}
        </span>
        {Number.isFinite(TIER_LIMITS[tier]?.maxEntities) && entityCount >= (TIER_LIMITS[tier]?.maxEntities ?? Infinity) && (
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

      {/* Row 2: Portfolio pulse + Stat Cards */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        {/* Raw attention counts keep the next moves visible. */}
        <div className="lg:col-span-2 rounded-xl glass border border-white/[0.06] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Needs attention</p>
              <p className="mt-2 text-sm text-white/65">Keep your next moves visible.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs font-medium">
              <Link href="/tasks" className="rounded-full bg-rose-500/10 px-2.5 py-1 text-rose-300 hover:bg-rose-500/20">
                {overdueTaskCount} overdue
              </Link>
              <Link href="/tasks?status=BLOCKED" className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-300 hover:bg-amber-500/20">
                {blockedTaskCount} blocked
              </Link>
            </div>
          </div>
        </div>
        {/* Stat cards take remaining 5 columns */}
        <div className="lg:col-span-5 grid gap-4 grid-cols-2 sm:grid-cols-3">
          <StatCard label="Entities" value={entityCount} icon={Building2} accent="text-blue-400" href="/entities" />
          <StatCard label="Active Projects" value={activeProjectCount} icon={FolderKanban} accent="text-emerald-400" href="/projects" />
          <StatCard label="Open Tasks" value={openTaskCount} icon={CheckSquare} accent="text-violet-400" href="/tasks" />
          <StatCard label="Waiting On" value={waitingOnCount} icon={Clock} accent="text-amber-400" href="/tasks?status=WAITING_ON" />
          <StatCard label="Documents" value={docCount} icon={FileText} accent="text-sky-400" href="/documents" />
          <StatCard label="Contacts" value={contactCount} icon={Users} accent="text-rose-400" href="/contacts" />
        </div>
        {isTrial && trialDaysRemaining !== null && (
          <div className="rounded-xl glass border border-white/[0.06] p-4 flex flex-col justify-between">
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
          <div className="rounded-xl glass p-5 space-y-3">
            <div className="h-5 w-36 bg-white/[0.04] rounded animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-white/[0.04] rounded-lg animate-pulse" />
            ))}
          </div>
        }>
          <CriticalTasks orgId={orgId} />
        </Suspense>
        <Suspense fallback={
          <div className="rounded-xl glass p-5 space-y-3">
            <div className="h-5 w-36 bg-white/[0.04] rounded animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-white/[0.04] rounded-lg animate-pulse" />
            ))}
          </div>
        }>
          <UpcomingDeadlines orgId={orgId} />
        </Suspense>
      </div>

      {/* Awaiting My Review — shows READY_FOR_REVIEW tasks for owner */}
      {awaitingReviewTasks.length > 0 && (
        <div className="rounded-xl glass border border-purple-500/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
              <CheckSquare className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <h2 className="text-base font-semibold">Awaiting My Review</h2>
            <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 text-purple-400 bg-purple-500/10 border-purple-500/20">
              {awaitingReviewTasks.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {awaitingReviewTasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center gap-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] p-3 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-white transition-colors">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {task.assignee && (
                      <span className="text-[11px] text-muted-foreground">
                        by {task.assignee.name}
                      </span>
                    )}
                    {task.entity && (
                      <span className="text-[11px] text-muted-foreground/60">
                        · {task.entity.name}
                      </span>
                    )}
                    {task.project && (
                      <span className="text-[11px] text-muted-foreground/60">
                        · {task.project.name}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-purple-400 font-medium shrink-0 group-hover:underline">
                  Review →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {awaitingReviewTasks.length === 0 && (
        <div className="rounded-xl glass border border-white/[0.06] p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
              <CheckSquare className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <h2 className="text-base font-semibold">Awaiting My Review</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-3">Nothing awaiting your review</p>
        </div>
      )}

      {/* Row 4: Active Projects + Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={
          <div className="rounded-xl glass p-5 space-y-3">
            <div className="h-5 w-36 bg-white/[0.04] rounded animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-white/[0.04] rounded-lg animate-pulse" />
            ))}
          </div>
        }>
          <ActiveProjects orgId={orgId} />
        </Suspense>
        <Suspense fallback={
          <div className="rounded-xl glass p-5 space-y-3">
            <div className="h-5 w-36 bg-white/[0.04] rounded animate-pulse" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />
            ))}
          </div>
        }>
          <ActivityFeed orgId={orgId} />
        </Suspense>
      </div>

      {/* Row 5: Waiting On (full width) */}
      <Suspense fallback={
        <div className="rounded-xl glass p-5 space-y-3">
          <div className="h-5 w-44 bg-white/[0.04] rounded animate-pulse" />
          <div className="grid gap-2 grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-white/[0.04] rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      }>
        <WaitingOn orgId={orgId} />
      </Suspense>
    </div>
  )
}
