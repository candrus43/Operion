import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import {
  Users,
  FlaskConical,
  CreditCard,
  Clock,
  DollarSign,
  TrendingUp,
  Sparkles,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── KPI Card ──────────────────────────────────────────────────────
function KPICard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  accent: string
  sub?: string
}) {
  return (
    <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium uppercase tracking-wider">
        <Icon className={cn("h-3.5 w-3.5", accent)} />
        {label}
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-zinc-500 -mt-1">{sub}</div>}
    </div>
  )
}

// ── AI Insights Panel ─────────────────────────────────────────────
async function AIInsights({ metrics }: { metrics: Record<string, any> }) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    return (
      <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold">AI Insights</h3>
        </div>
        <p className="text-sm text-zinc-500">OpenAI API key not configured. Add OPENAI_API_KEY to enable insights.</p>
      </div>
    )
  }

  const prompt = `You are an AI business analyst for a SaaS platform called Operion (AI Chief of Staff for entrepreneurs). Analyze these platform metrics and provide 3-4 actionable, specific insights for the founder. Be concise and direct. Each insight should be one sentence with a suggested action.

Metrics:
- Total registered users: ${metrics.totalUsers}
- Active trials (not expired): ${metrics.activeTrials}
- Paying customers (subscriptionStatus=ACTIVE): ${metrics.payingCustomers}
- Trials expiring within 3 days: ${metrics.trialsExpiringSoon}
- Total MRR: $${metrics.totalMRR}
- Trial conversion rate: ${metrics.conversionRate}%
- Churned/at-risk orgs (no activity in 7+ days): ${metrics.atRiskOrgs}
- Total organizations: ${metrics.totalOrgs}

Respond as a bullet list. Each bullet: a specific observation followed by a concrete recommendation in parentheses.`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a data-driven SaaS business analyst. Be specific, concise, and actionable. Use bullet points." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("OpenAI insights error:", err)
      return <InsightFallback />
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ""

    // Parse bullet points
    const bullets = content
      .split("\n")
      .filter((line: string) => line.trim().startsWith("-") || line.trim().startsWith("•") || line.trim().startsWith("*"))
      .map((line: string) => line.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean)

    if (bullets.length === 0) {
      // Try splitting on newlines and taking non-empty lines
      const lines = content.split("\n").map((l: string) => l.trim()).filter(Boolean)
      if (lines.length > 0) {
        return <InsightDisplay lines={lines} />
      }
      return <InsightDisplay lines={[content.trim()]} />
    }

    return <InsightDisplay lines={bullets} />
  } catch (err) {
    console.error("AI insights fetch error:", err)
    return <InsightFallback />
  }
}

function InsightDisplay({ lines }: { lines: string[] }) {
  return (
    <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold">AI Insights</h3>
      </div>
      <ul className="space-y-2">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
            <span className="text-amber-400 mt-0.5 shrink-0">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function InsightFallback() {
  return (
    <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold">AI Insights</h3>
      </div>
      <p className="text-sm text-zinc-500">Could not generate insights at this time. Metrics are still displayed below.</p>
    </div>
  )
}

// ── Trial Conversion Funnel ───────────────────────────────────────
function ConversionFunnel({
  signups,
  activated,
  converted,
}: {
  signups: number
  activated: number
  converted: number
}) {
  const stages = [
    { label: "Signups", value: signups, pct: signups > 0 ? 100 : 0, color: "bg-zinc-600" },
    { label: "Activated", value: activated, pct: signups > 0 ? Math.round((activated / signups) * 100) : 0, color: "bg-blue-500" },
    { label: "Converted (Paid)", value: converted, pct: signups > 0 ? Math.round((converted / signups) * 100) : 0, color: "bg-emerald-500" },
  ]
  const maxVal = Math.max(signups, 1)

  return (
    <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-blue-400" />
        <h3 className="text-sm font-semibold">Trial Conversion Funnel</h3>
      </div>
      <div className="space-y-4">
        {stages.map((stage, i) => (
          <div key={stage.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-zinc-400">{stage.label}</span>
              <span className="text-sm font-semibold tabular-nums">
                {stage.value}
                <span className="text-xs text-zinc-500 ml-1">({stage.pct}%)</span>
              </span>
            </div>
            <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", stage.color)}
                style={{ width: `${Math.max((stage.value / maxVal) * 100, 1)}%` }}
              />
            </div>
            {i < stages.length - 1 && (
              <div className="text-xs text-zinc-600 mt-1.5 ml-1">
                Drop-off: {stages[i].value - stages[i + 1].value} ({stages[i].value > 0 ? Math.round(((stages[i].value - stages[i + 1].value) / stages[i].value) * 100) : 0}%)
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Churn Watchlist ───────────────────────────────────────────────
function ChurnWatchlist({ orgs }: { orgs: any[] }) {
  return (
    <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold">Churn Watchlist</h3>
        <span className="text-xs text-zinc-500 ml-auto">{orgs.length} at risk</span>
      </div>
      {orgs.length === 0 ? (
        <p className="text-sm text-zinc-500">No organizations at risk — all active.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 border-b border-white/[0.04]">
                <th className="text-left py-2 font-medium">Organization</th>
                <th className="text-left py-2 font-medium">Owner</th>
                <th className="text-right py-2 font-medium">Inactive (Days)</th>
                <th className="text-right py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                  <td className="py-2.5 font-medium">{org.name}</td>
                  <td className="py-2.5 text-zinc-400">{org.ownerEmail}</td>
                  <td className="py-2.5 text-right">
                    <span className={cn(
                      "tabular-nums",
                      org.daysSinceActivity > 14 ? "text-red-400" : "text-amber-400"
                    )}>
                      {org.daysSinceActivity}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                      org.subscriptionStatus === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" :
                      org.subscriptionStatus === "TRIAL" ? "bg-amber-500/10 text-amber-400" :
                      "bg-red-500/10 text-red-400"
                    )}>
                      {org.subscriptionStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default async function AdminOverviewPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session.user as any).role !== "OWNER") redirect("/home")

  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Fetch all metrics in parallel
  const [
    totalUsers,
    activeTrials,
    payingCustomers,
    trialsExpiringSoon,
    totalOrgs,
    allOrgs,
    activatedOrgs,
    convertedOrgs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count({
      where: {
        subscriptionStatus: "TRIAL",
        trialEndDate: { gte: now },
      },
    }),
    prisma.organization.count({
      where: { subscriptionStatus: "ACTIVE" },
    }),
    prisma.organization.count({
      where: {
        subscriptionStatus: "TRIAL",
        trialEndDate: { lte: threeDaysFromNow, gte: now },
      },
    }),
    prisma.organization.count(),
    prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        subscriptionTier: true,
        trialEndDate: true,
        createdAt: true,
        users: {
          select: { email: true, role: true },
          where: { role: "OWNER" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    // "Activated" = orgs where at least one user has logged in (has a session)
    prisma.organization.count({
      where: {
        users: {
          some: {
            sessions: { some: {} },
          },
        },
      },
    }),
    // Converted = ACTIVE status
    prisma.organization.count({
      where: { subscriptionStatus: "ACTIVE" },
    }),
  ])

  // Calculate MRR manually — sum up plan prices by org tier
  const activeOrgs = allOrgs.filter(o => o.subscriptionStatus === "ACTIVE")
  const totalMRR = activeOrgs.reduce((sum, o) => {
    return sum + (o.subscriptionTier === "TEAM" ? 499 : 249)
  }, 0)

  // Churn watchlist: orgs with no audit log in 7+ days
  const churnCandidates = await Promise.all(
    allOrgs.map(async (org) => {
      const lastActivity = await prisma.auditLog.findFirst({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      })
      if (!lastActivity) {
        // No activity at all — use createdAt as baseline
        const days = Math.ceil((now.getTime() - org.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        if (days >= 7) {
          return {
            id: org.id,
            name: org.name,
            ownerEmail: org.users[0]?.email || "N/A",
            daysSinceActivity: days,
            subscriptionStatus: org.subscriptionStatus,
          }
        }
        return null
      }
      const days = Math.ceil((now.getTime() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      if (days >= 7) {
        return {
          id: org.id,
          name: org.name,
          ownerEmail: org.users[0]?.email || "N/A",
          daysSinceActivity: days,
          subscriptionStatus: org.subscriptionStatus,
        }
      }
      return null
    })
  )

  const atRiskOrgs = churnCandidates.filter(Boolean) as any[]
  const conversionRate = totalOrgs > 0 ? Math.round((convertedOrgs / totalOrgs) * 100) : 0

  const metrics = {
    totalUsers,
    activeTrials,
    payingCustomers,
    trialsExpiringSoon,
    totalMRR,
    conversionRate,
    atRiskOrgs: atRiskOrgs.length,
    totalOrgs,
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Platform overview, customer insights, and content management.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <KPICard label="Total Users" value={totalUsers} icon={Users} accent="text-blue-400" />
        <KPICard label="Active Trials" value={activeTrials} icon={FlaskConical} accent="text-amber-400" />
        <KPICard label="Paying Customers" value={payingCustomers} icon={CreditCard} accent="text-emerald-400" />
        <KPICard label="Expiring Soon" value={trialsExpiringSoon} icon={Clock} accent="text-red-400" sub="within 3 days" />
        <KPICard label="MRR" value={`$${totalMRR.toLocaleString()}`} icon={DollarSign} accent="text-violet-400" sub={`${activeOrgs.length} active`} />
      </div>

      {/* Row 2: Conversion Funnel + AI Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ConversionFunnel
          signups={totalOrgs}
          activated={activatedOrgs}
          converted={convertedOrgs}
        />
        <Suspense fallback={<InsightFallback />}>
          <AIInsights metrics={metrics} />
        </Suspense>
      </div>

      {/* Row 3: Churn Watchlist (full width) */}
      <ChurnWatchlist orgs={atRiskOrgs} />
    </div>
  )
}
