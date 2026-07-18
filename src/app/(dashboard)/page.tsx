import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AIBriefing } from "@/components/dashboard/ai-briefing"
import { StatCard, CriticalTasks, UpcomingDeadlines, ActiveProjects, ActivityFeed, WaitingOn } from "@/components/dashboard/widgets"
import { DashboardSkeleton } from "@/components/dashboard/skeletons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Building2,
  FolderKanban,
  CheckSquare,
  Clock,
  FileText,
  Users,
  Sparkles,
  ArrowRight,
  Upload,
  Plus,
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
          <Sparkles className="h-9 w-9 text-amber-400" />
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
        <Button asChild size="lg" className="gap-2">
          <Link href="/entities/new">
            <Plus className="h-4 w-4" />
            Add your first entity
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="gap-2 border-[#262626] bg-[#1a1a1a] hover:bg-[#222]">
          <Link href="/import">
            <Upload className="h-4 w-4" />
            Import data
          </Link>
        </Button>
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
  ] = await Promise.all([
    prisma.entity.count({ where: { organizationId: orgId } }),
    prisma.project.count({ where: { organizationId: orgId, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    prisma.task.count({ where: { organizationId: orgId, status: { not: "DONE" } } }),
    prisma.task.count({ where: { organizationId: orgId, status: "WAITING_ON" } }),
    prisma.document.count({ where: { organizationId: orgId } }),
    prisma.contact.count({ where: { organizationId: orgId } }),
  ])

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

      {/* Row 2: Stat Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Entities" value={entityCount} icon={Building2} accent="text-blue-400" />
        <StatCard label="Active Projects" value={activeProjectCount} icon={FolderKanban} accent="text-emerald-400" />
        <StatCard label="Open Tasks" value={openTaskCount} icon={CheckSquare} accent="text-violet-400" />
        <StatCard label="Waiting On" value={waitingOnCount} icon={Clock} accent="text-amber-400" />
        <StatCard label="Documents" value={docCount} icon={FileText} accent="text-sky-400" />
        <StatCard label="Contacts" value={contactCount} icon={Users} accent="text-rose-400" />
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
