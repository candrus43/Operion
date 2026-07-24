import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AIBriefing } from "@/components/dashboard/ai-briefing"
import { StatCard, CriticalTasks, UpcomingDeadlines, ActiveProjects, ActivityFeed, WaitingOn } from "@/components/dashboard/widgets"
import { DashboardSkeleton } from "@/components/dashboard/skeletons"
import { cn } from "@/lib/utils"
import {
  Building2,
  FolderKanban,
  CheckSquare,
  Clock,
  FileText,
  Users,
  ArrowRight,
  Upload,
  Plus,
  Calendar,
} from "lucide-react"

function WelcomeEmptyState({ userName }: { userName: string }) {
  const firstName = userName?.split(" ")[0] || "there"

  const steps = [
    {
      step: 1,
      title: "Add your first entity",
      description: "Add a business, hotel, property, or investment you manage.",
      href: "/entities/new",
      icon: Building2,
      accent: "text-blue-400",
      bgAccent: "bg-blue-500/10",
    },
    {
      step: 2,
      title: "Create a project",
      description: "Track acquisitions, renovations, or operational initiatives.",
      href: "/projects/new",
      icon: FolderKanban,
      accent: "text-emerald-400",
      bgAccent: "bg-emerald-500/10",
    },
    {
      step: 3,
      title: "Invite your team",
      description: "Bring in your EA, operations manager, or staff to collaborate.",
      href: "/settings",
      icon: Users,
      accent: "text-violet-400",
      bgAccent: "bg-violet-500/10",
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      {/* Decorative glow */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-3xl scale-150" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-blue-500/20 ring-1 ring-white/[0.06]">
          <img src="/logo.svg" className="h-9 w-9" alt="Operion" />
        </div>
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Welcome to Operion
      </h1>
      <p className="text-lg text-amber-400 font-medium mb-3">
        Nice to meet you, {firstName}
      </p>
      <p className="text-muted-foreground max-w-md mb-10 leading-relaxed">
        Your AI Chief of Staff is ready. Follow the steps below to get your workspace set up.
      </p>

      {/* Onboarding Steps */}
      <div className="grid gap-4 sm:grid-cols-3 max-w-3xl w-full mb-10">
        {steps.map((item, idx) => (
          <Link
            key={item.title}
            href={item.href}
            className="group relative rounded-xl bg-[#111111] border border-white/[0.04] p-6 text-left hover:bg-[#151515] hover:border-white/[0.08] transition-all"
          >
            {/* Step number badge */}
            <div className="absolute -top-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#080808] border border-white/[0.06]">
              <span className="text-xs font-bold text-muted-foreground">{item.step}</span>
            </div>

            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl mb-4", item.bgAccent)}>
              <item.icon className={cn("h-5 w-5", item.accent)} />
            </div>
            <h3 className="text-sm font-semibold mb-1.5 group-hover:text-foreground transition-colors">
              {item.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>

            {/* Arrow on hover */}
            <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground/0 group-hover:text-primary transition-all">
              Get started
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/entities/new"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
        >
          <Plus className="h-4 w-4" />
          Add your first entity
        </Link>
        <Link
          href="/import"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-[#262626] bg-[#1a1a1a] hover:bg-[#222] text-foreground h-11 px-8"
        >
          <Upload className="h-4 w-4" />
          Import data
        </Link>
      </div>

      {/* Skip link */}
      <p className="mt-8 text-xs text-muted-foreground">
        Already have data?{" "}
        <Link href="/import" className="text-foreground hover:underline font-medium">
          Import it here
        </Link>
        {" "}or explore the{" "}
        <Link href="/ai" className="text-foreground hover:underline font-medium">
          AI Assistant
        </Link>
      </p>
    </div>
  )
}

export default async function DashboardPage() {
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

  // Quick counts for stat cards
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
      select: { subscriptionStatus: true, trialEndDate: true, subscriptionTier: true },
    }),
  ])

  const tier = org?.subscriptionTier || "SOLO"
  const tierLabel = tier === "ENTERPRISE" ? "Enterprise Plan" : tier === "TEAM" ? "Team Plan" : "Solo Plan"
  const tierBadgeColors: Record<string, string> = {
    SOLO: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    TEAM: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    ENTERPRISE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  }

  // Calculate trial days remaining
  let trialDaysRemaining: number | null = null
  let isTrial = false
  if (org?.subscriptionStatus === "TRIAL" && org?.trialEndDate) {
    isTrial = true
    trialDaysRemaining = Math.ceil(
      (org.trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    if (trialDaysRemaining < 0) trialDaysRemaining = 0
  }

  const userName = session.user.name || "there"

  // Show guided onboarding if org has no entities yet
  if (entityCount === 0) {
    return <WelcomeEmptyState userName={userName} />
  }

  return (
    <div className="space-y-6">
      {/* Row 1: AI Daily Briefing */}
      <Suspense fallback={<div className="rounded-2xl bg-[#111111] h-64 animate-pulse" />}>
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
            <span className="text-amber-300/80">You've reached your entity limit.</span>
            <Link
              href="/pricing"
              className="ml-2 shrink-0 text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2"
            >
              Upgrade to add more →
            </Link>
          </div>
        )}
      </div>

      {/* Row 2: Stat Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Entities" value={entityCount} icon={Building2} accent="text-blue-400" />
        <StatCard label="Active Projects" value={activeProjectCount} icon={FolderKanban} accent="text-emerald-400" />
        <StatCard label="Open Tasks" value={openTaskCount} icon={CheckSquare} accent="text-violet-400" />
        <StatCard label="Waiting On" value={waitingOnCount} icon={Clock} accent="text-amber-400" />
        <StatCard label="Documents" value={docCount} icon={FileText} accent="text-sky-400" />
        <StatCard label="Contacts" value={contactCount} icon={Users} accent="text-rose-400" />
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
