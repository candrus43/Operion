import Link from "next/link"
import {
  ArrowRight,
  Sparkles,
  Building2,
  Search,
  Zap,
  Brain,
  LayoutDashboard,
  FileText,
  Lock,
  Shield,
  Download,
  Plug,
  BarChart3,
  Bell,
  Layers,
} from "lucide-react"
import { ScrollReveal } from "@/components/scroll-reveal"

const stats = [
  { value: "5+", label: "Entities managed" },
  { value: "100+", label: "Projects tracked" },
  { value: "AI", label: "Powered insights" },
]

const steps = [
  {
    icon: Plug,
    title: "Connect your entities",
    description:
      "Add your businesses, properties, and investments. Operion pulls in tasks, projects, and documents — no migration needed.",
  },
  {
    icon: Brain,
    title: "AI analyzes your portfolio",
    description:
      "Our AI scans across every entity, flags risks, tracks deadlines, and identifies what needs your attention.",
  },
  {
    icon: Bell,
    title: "Get your daily briefing",
    description:
      "Log in to a prioritized summary of what matters. No noise, no digging — just the signal you need to run your portfolio.",
  },
]

const features = [
  {
    icon: Brain,
    title: "AI Daily Briefing",
    description:
      "Log in and your AI Chief of Staff tells you what needs attention — before you even ask.",
  },
  {
    icon: Building2,
    title: "Multi-Entity Management",
    description:
      "Manage businesses, hotels, properties, and investments across your entire portfolio.",
  },
  {
    icon: LayoutDashboard,
    title: "EA Workspace",
    description:
      "Dedicated command center for executive assistants to manage priorities, tasks, and communications.",
  },
  {
    icon: Search,
    title: "Cross-Entity Search",
    description:
      "Search across every task, project, document, and contact — instantly, from one place.",
  },
  {
    icon: FileText,
    title: "Document Center",
    description:
      "Organize contracts, leases, and filings by entity type with structured categorization.",
  },
  {
    icon: Zap,
    title: "Smart Task Suggestions",
    description:
      "AI recommends next actions based on deadlines, dependencies, and portfolio activity.",
  },
]

const trustPoints = [
  {
    icon: Lock,
    title: "Enterprise-grade encryption",
    description:
      "Your data is encrypted at rest and in transit with industry-standard protocols.",
  },
  {
    icon: Shield,
    title: "Never shared or sold",
    description:
      "We don't sell, share, or monetize your data. Your portfolio is your business.",
  },
  {
    icon: Download,
    title: "Export anytime",
    description:
      "Download all your organization data as JSON — no lock-in, ever.",
  },
]

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] rounded-full bg-violet-500/[0.03] blur-[120px] animate-float-slow" />
      <div className="absolute bottom-1/3 right-0 w-[400px] h-[400px] rounded-full bg-blue-500/[0.03] blur-[100px] animate-float-slow-reverse" />
      <div className="absolute top-2/3 left-1/3 w-[300px] h-[300px] rounded-full bg-indigo-500/[0.02] blur-[80px] animate-float-slow" />
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080808] relative">
      {/* Background layers */}
      <div className="fixed inset-0 bg-grid-pattern opacity-60 pointer-events-none" />
      <FloatingOrbs />

      <div className="relative z-10">
        {/* Navigation */}
        <header className="border-b border-white/[0.04] backdrop-blur-sm bg-[#080808]/80">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground group-hover:bg-violet-400 transition-colors duration-300">
                  <Sparkles className="h-4 w-4 text-background" />
                </div>
                <span className="text-base font-semibold tracking-tight">
                  Operion
                </span>
              </Link>
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium text-muted-foreground hover:text-foreground h-9 px-3 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-sm font-medium h-9 px-4 transition-all hover:bg-foreground/90 hover:shadow-[0_0_20px_rgba(250,250,250,0.1)]"
                >
                  Get Started
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-20 pb-12 sm:px-6 sm:pt-28 sm:pb-16 lg:px-8 lg:pt-36">
          <div className="mx-auto max-w-3xl text-center space-y-8">
            <ScrollReveal>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-[#111111]/80 backdrop-blur-sm px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 text-violet-400" />
                AI Chief of Staff for entrepreneurs
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
                Your entire portfolio.
                <br />
                <span className="gradient-text">One dashboard. Zero noise.</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed sm:text-lg">
                Operion doesn&apos;t just organize your businesses — it runs
                alongside you. AI surfaces what matters, catches what you&apos;d
                miss, and tells you what to do next.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium h-12 px-8 w-full sm:w-auto transition-all hover:bg-foreground/90 hover:shadow-[0_0_30px_rgba(250,250,250,0.12)]"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#262626] bg-[#111111] text-sm font-medium h-12 px-8 w-full sm:w-auto transition-all hover:bg-[#1a1a1a] hover:border-white/[0.08]"
                >
                  Sign In
                </Link>
              </div>
              <p className="text-xs text-muted-foreground pt-3">
                14-day free trial · No credit card required
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Stats Banner */}
        <ScrollReveal>
          <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
            <div className="mx-auto max-w-xl">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-[#111111]/60 backdrop-blur-sm px-5 py-3 w-full sm:w-auto justify-center animate-pulse-glow"
                  >
                    <span className="text-xl font-bold tracking-tight text-violet-300">
                      {stat.value}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                How it works
              </h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm">
                Three steps to turn scattered information into a clear daily
                action plan.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <ScrollReveal key={step.title} delay={i * 100}>
                <div className="relative text-center group">
                  {/* Step connector line */}
                  {i < steps.length - 1 && (
                    <div className="hidden sm:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-white/[0.06]">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/[0.08]" />
                    </div>
                  )}
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#111111] border border-white/[0.05] mx-auto mb-5 group-hover:border-violet-500/20 group-hover:bg-[#151515] transition-all duration-300">
                    <step.icon className="h-7 w-7 text-foreground/50 group-hover:text-violet-400 transition-colors duration-300" />
                  </div>
                  <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1a1a1a] border border-white/[0.05] text-[10px] font-semibold text-muted-foreground mb-3">
                    {i + 1}
                  </div>
                  <h3 className="text-sm font-semibold mb-2">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                    {step.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Dashboard Preview */}
        <ScrollReveal>
          <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d0d] overflow-hidden shadow-[0_0_60px_rgba(168,139,250,0.04)]">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-[#111111] border-b border-white/[0.04]">
                  <div className="flex gap-1.5 shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="w-56 h-5 rounded-full bg-[#1a1a1a] border border-white/[0.05] flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground/60">
                        app.operion.online
                      </span>
                    </div>
                  </div>
                </div>

                {/* Screenshot with blur overlay */}
                <div className="relative">
                  <img
                    src="/dashboard-preview.png"
                    alt="Operion Dashboard"
                    className="w-full"
                  />
                  {/* Blur overlay to obscure top bar branding */}
                  <div className="absolute top-0 left-0 right-0 h-[40px] backdrop-blur-[8px] bg-[#0d0d0d]/30" />
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-4">
                Your AI briefing — priorities, risks, and next actions across
                every entity.
              </p>
            </div>
          </section>
        </ScrollReveal>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Everything you need to run your portfolio
              </h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm">
                Built for owners managing multiple entities who are tired of
                scattered spreadsheets, overflowing inboxes, and things falling
                through the cracks.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <ScrollReveal key={feature.title} delay={i * 80}>
                <div className="card-glow group rounded-xl bg-[#111111] border border-white/[0.04] p-6 cursor-default">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/[0.04] mb-4 group-hover:bg-violet-400/10 group-hover:scale-110 transition-all duration-300">
                    <feature.icon className="h-5 w-5 text-foreground/60 group-hover:text-violet-400 transition-colors duration-300" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Trust */}
        <ScrollReveal>
          <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Your data belongs to you
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
              {trustPoints.map((point) => (
                <div
                  key={point.title}
                  className="rounded-xl bg-[#0d0d0d] border border-white/[0.03] p-5 text-center card-glow cursor-default"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/[0.04] mx-auto mb-3">
                    <point.icon className="h-4 w-4 text-foreground/50" />
                  </div>
                  <h3 className="text-xs font-semibold mb-1">{point.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {point.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal>
          <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
            <div className="rounded-2xl bg-[#111111] border border-white/[0.04] p-8 sm:p-16 text-center max-w-2xl mx-auto relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full bg-violet-500/[0.03] blur-[80px] pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-400/10 mb-6">
                  <Sparkles className="h-6 w-6 text-violet-400" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3">
                  Ready to see everything in one place?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm">
                  Join entrepreneurs who trust Operion as their AI Chief of
                  Staff. Start your 14-day free trial today.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium h-12 px-8 w-full sm:w-auto transition-all hover:bg-foreground/90 hover:shadow-[0_0_30px_rgba(250,250,250,0.12)]"
                  >
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#262626] bg-[#1a1a1a] text-sm font-medium h-12 px-8 w-full sm:w-auto transition-all hover:bg-[#222]"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Footer */}
        <footer className="border-t border-white/[0.04]">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground/[0.08]">
                  <Sparkles className="h-3 w-3 text-foreground/50" />
                </div>
                <span className="text-xs text-muted-foreground">Operion</span>
              </div>
              <div className="flex items-center gap-6">
                <Link
                  href="/pricing"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/login"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
