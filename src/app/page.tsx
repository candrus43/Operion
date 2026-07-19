import Link from "next/link"
import { ArrowRight, Sparkles, Building2, Search, Zap, Brain, LayoutDashboard, FileText } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "AI Daily Briefing",
    description: "Log in and your AI Chief of Staff tells you what needs attention — before you even ask.",
  },
  {
    icon: Building2,
    title: "Multi-Entity Management",
    description: "Manage businesses, hotels, properties, and investments across your entire portfolio.",
  },
  {
    icon: LayoutDashboard,
    title: "Executive Assistant Workspace",
    description: "Dedicated command center for EAs to manage priorities, tasks, and communications.",
  },
  {
    icon: Search,
    title: "Cross-Entity Search",
    description: "Search across every task, project, document, and contact — instantly, from one place.",
  },
  {
    icon: FileText,
    title: "Document Center",
    description: "Organize contracts, leases, and filings by entity type with structured categorization.",
  },
  {
    icon: Zap,
    title: "Smart Task Suggestions",
    description: "AI recommends next actions based on deadlines, dependencies, and portfolio activity.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Navigation */}
      <header className="border-b border-white/[0.04]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
                <Sparkles className="h-4 w-4 text-background" />
              </div>
              <span className="text-base font-semibold tracking-tight">Operion</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login" className="inline-flex items-center justify-center rounded-md text-sm font-medium text-muted-foreground hover:text-foreground h-9 px-3 transition-colors">
                Sign In
              </Link>
              <Link href="/register" className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 transition-colors hover:bg-primary/90">
                Get Started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-24 pb-16 sm:px-6 lg:px-8 lg:pt-32">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-[#111111] px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            AI Chief of Staff for entrepreneurs
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Run your entire portfolio
            <br />
            <span className="text-muted-foreground">from one dashboard</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Operion sits above your existing tools, giving you a single place to see
            everything across your companies. AI prioritizes, surfaces risks, and
            recommends what to do next.
          </p>
          <div className="flex items-center justify-center gap-3 pt-4">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium h-11 px-8 transition-colors hover:bg-primary/90">
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-md border border-[#262626] bg-[#1a1a1a] text-sm font-medium h-11 px-8 transition-colors hover:bg-[#222]">
              Sign In
            </Link>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            14-day free trial · No credit card required
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Everything you need to run your portfolio
          </h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            Built for owners managing multiple entities who are tired of scattered
            spreadsheets, overflowing inboxes, and things falling through the cracks.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl bg-[#111111] border border-white/[0.04] p-6 transition-colors hover:bg-[#151515]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/5 mb-4 group-hover:bg-foreground/10 transition-colors">
                <feature.icon className="h-5 w-5 text-foreground/70" />
              </div>
              <h3 className="text-sm font-semibold mb-1.5">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-[#111111] border border-white/[0.04] p-10 sm:p-16 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-6">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3">
            Ready to see everything in one place?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join entrepreneurs who trust Operion as their AI Chief of Staff. Start
            your 14-day free trial today.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium h-11 px-8 transition-colors hover:bg-primary/90">
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-md border border-[#262626] bg-[#1a1a1a] text-sm font-medium h-11 px-8 transition-colors hover:bg-[#222]">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground/10">
                <Sparkles className="h-3 w-3 text-foreground/60" />
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
  )
}
