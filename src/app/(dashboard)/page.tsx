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

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      {/* Decorative glow */}
      <div className="relative mb-10">
        <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-3xl scale-150" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-blue-500/20 ring-1 ring-white/[0.06]">
          <Sparkles className="h-9 w-9 text-amber-400" />
        </div>
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-3">
        Welcome to Operion, <span className="text-amber-400">{firstName}</span>
      </h1>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        Your AI Chief of Staff is ready. Start by adding your first entity — 
        a business, property, or investment — and we&apos;ll help you stay on top of everything.
      </p>

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

      <div className="mt-16 grid gap-6 sm:grid-cols-3 max-w-2xl w-full">
        {[
          {
            icon: Building2,
            title: "Add entities",
            description: "Businesses, hotels, properties, or investments you manage",
            accent: "text-blue-400",
          },
          {
            icon: FolderKanban,
            title: "Create projects",
            description: "Track acquisitions, renovations, and operational initiatives",
            accent: "text-emerald-400",
          },
          {
            icon: CheckSquare,
            title: "Manage tasks",
            description: "AI-powered task management with smart prioritization",
            accent: "text-violet-400",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl bg-[#111111] border border-white/[0.04] p-5 text-left hover:bg-[#151515] transition-colors"
          >
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 mb-3", item.accent)}>
              <item.icon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
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

  // Show welcoming empty state if org has no entities
  if (entityCount === 0 && activeProjectCount === 0 && openTaskCount === 0) {
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
