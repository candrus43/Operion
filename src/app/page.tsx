import Link from "next/link"
import {
  ArrowRight,
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
  Bell,
  Play,
  Users,
  ClipboardList,
  Clock,
  HelpCircle,
  Check,
  Home,
  Briefcase,
  Building,
} from "lucide-react"
import { ScrollReveal } from "@/components/scroll-reveal"

const entityTypes = [
  { icon: Building2, label: "LLCs & C-Corps" },
  { icon: Home, label: "Real estate & properties" },
  { icon: Briefcase, label: "Investment portfolios" },
  { icon: Building, label: "Operating businesses" },
]

const steps = [
  {
    icon: Plug,
    title: "Drop in what you already have",
    description:
      "Import spreadsheets, connect accounts. Operion maps your portfolio in minutes — no migration needed.",
  },
  {
    icon: Brain,
    title: "AI finds what you'd miss",
    description:
      "Cross-entity risk detection, deadline tracking, and priority scoring. No manual setup required.",
  },
  {
    icon: Bell,
    title: "Start every day with clarity",
    description:
      "Open Operion. Read your briefing. Know exactly what needs your attention today — before you even ask.",
  },
]

const features = [
  {
    icon: Brain,
    title: "Start every day knowing what to do",
    description:
      "Log in and your AI Chief of Staff tells you what needs attention — before you even ask.",
  },
  {
    icon: Building2,
    title: "One view across all your businesses",
    description:
      "Manage LLCs, properties, operating companies, and investments from a single dashboard.",
  },
  {
    icon: LayoutDashboard,
    title: "Your assistant's command center",
    description:
      "Dedicated workspace for executive assistants to manage priorities, tasks, and communications.",
  },
  {
    icon: Search,
    title: "Find anything, anywhere, instantly",
    description:
      "Search across every task, project, document, and contact — across every entity, in one query.",
  },
  {
    icon: FileText,
    title: "Contracts, leases, filings — organized",
    description:
      "All your documents structured by entity type. No more digging through folders and email attachments.",
  },
  {
    icon: Zap,
    title: "AI recommends your next move",
    description:
      "Smart suggestions based on deadlines, dependencies, and activity across your entire portfolio.",
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
  {
    icon: Clock,
    title: "14-day free trial",
    description:
      "Try everything with no credit card required. Cancel anytime.",
  },
]

const personas = [
  {
    icon: Building2,
    title: "Multi-entity owners",
    description:
      "Running hotels, gas stations, and investments? See everything in one place.",
  },
  {
    icon: Users,
    title: "Executive Assistants",
    description:
      "Stop chasing updates. Your daily priority queue tells you what needs attention.",
  },
  {
    icon: ClipboardList,
    title: "Fractional executives",
    description:
      "Portfolio operators, family offices, and COOs managing across multiple orgs.",
  },
]

const pricingPlans = [
  {
    name: "Solo",
    setupFee: "$2,500",
    price: "$249",
    period: "/month",
    description: "For solo operators managing a portfolio of entities.",
    features: [
      "1 user seat",
      "Unlimited entities",
      "AI daily briefing",
      "Task & project management",
      "Document & contact center",
      "Document search",
      "EA workspace",
      "White-glove setup included",
    ],
    excluded: [
      "Multi-user access",
      "Role-based permissions",
      "Dedicated tenant",
    ],
    highlighted: false,
  },
  {
    name: "Team",
    setupFee: "$5,000",
    price: "$499",
    period: "/month",
    description: "For owners and teams running multiple entities.",
    features: [
      "Up to 5 user seats",
      "Unlimited entities",
      "AI daily briefing",
      "Task & project management",
      "Document & contact center",
      "Document search",
      "EA workspace",
      "Multi-user access",
      "Role-based permissions",
      "Dedicated tenant",
      "Priority support",
      "White-glove setup included",
    ],
    excluded: [],
    highlighted: true,
  },
]

const faqItems = [
  {
    question: "What does the setup fee include?",
    answer:
      "White-glove onboarding. We configure your entities, import your spreadsheets, map your document structure, and train your team — so you walk into a fully operational dashboard from day one.",
  },
  {
    question: "How long does onboarding take?",
    answer:
      "Most organizations are fully operational within 5 business days. Complex portfolios with 20+ entities and custom workflows may take up to 10 days.",
  },
  {
    question: "Can I import my existing spreadsheets?",
    answer:
      "Yes. Import CSV, Excel, or ICS files in one click. Our setup team handles bulk imports as part of your onboarding.",
  },
  {
    question: "How is this different from SmartSheets, Monday, or Airtable?",
    answer:
      "Those are tools you feed data into — blank canvases you have to build and maintain. Operion is an AI Chief of Staff that feeds you decisions. It scans across entities, surfaces risks, and tells you what to do next without any manual configuration.",
  },
  {
    question: "Can my assistant and accountant have their own access?",
    answer:
      "Yes. Team plan includes up to 5 seats with role-based permissions. Your EA gets a full workspace; your accountant can be limited to document and entity access.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Enterprise-grade encryption, isolated per organization. Your data belongs to you — never shared, sold, or used to train AI.",
  },
  {
    question: "Can I export my data if I leave?",
    answer:
      "Yes. Export all your organization data as JSON at any time — no lock-in, ever.",
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
                <img src="/logo.svg" alt="Operion" className="h-8 w-8 group-hover:opacity-90 transition-opacity" />
                <span className="text-base font-semibold tracking-tight">
                  Operion
                </span>
              </Link>
              <div className="flex items-center gap-3">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium text-muted-foreground hover:text-foreground h-9 px-3 transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium text-muted-foreground hover:text-foreground h-9 px-3 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/api/demo"
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-sm font-medium h-9 px-4 transition-all hover:bg-foreground/90 hover:shadow-[0_0_20px_rgba(250,250,250,0.1)]"
                >
                  Explore the Product
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
                <img src="/logo.svg" alt="" className="h-3 w-3" />
                AI Chief of Staff for entrepreneurs
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
                Your AI Chief of Staff
                <br />
                <span className="gradient-text">for every business you run.</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed sm:text-lg">
                Operion scans every entity, surfaces risks, and tells you what to
                do next — so you can run your entire portfolio from one dashboard,
                without anything falling through the cracks.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  href="/api/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium h-12 px-8 w-full sm:w-auto transition-all hover:bg-foreground/90 hover:shadow-[0_0_30px_rgba(250,250,250,0.12)]"
                >
                  <Play className="h-4 w-4" />
                  Explore the Product
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#262626] bg-[#111111] text-sm font-medium h-12 px-8 w-full sm:w-auto transition-all hover:bg-[#1a1a1a] hover:border-white/[0.08]"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="text-xs text-muted-foreground pt-3">
                14-day free trial · No credit card required
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Entity Types — replaces stats */}
        <ScrollReveal>
          <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
            <div className="mx-auto max-w-2xl">
              <p className="text-center text-xs text-muted-foreground mb-4 tracking-wide uppercase">
                Built for operators who manage
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {entityTypes.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-[#111111]/60 backdrop-blur-sm px-5 py-3"
                  >
                    <item.icon className="h-4 w-4 text-violet-400/70 shrink-0" />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {item.label}
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
                  {/* Topbar cover — hides demo user name and org branding */}
                  <div className="absolute top-0 left-0 right-0 h-[44px] bg-[#080808] rounded-t-lg z-10 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground/40 font-mono">app.operion.online</span>
                  </div>
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

        {/* Done-for-you setup */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <ScrollReveal>
            <div className="mx-auto max-w-2xl">
              <div className="rounded-2xl bg-gradient-to-b from-[#111111] to-[#0d0d0d] border border-white/[0.06] p-8 sm:p-12 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[150px] rounded-full bg-violet-500/[0.04] blur-[60px] pointer-events-none" />
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-400/10 mb-5">
                    <Plug className="h-6 w-6 text-violet-400" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3">
                    We set everything up for you
                  </h2>
                  <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
                    Your setup fee includes white-glove onboarding. We configure your entities,
                    import your spreadsheets, organize your documents, and train your team.
                    You walk into a fully operational AI Chief of Staff — not an empty tool
                    you have to build yourself. That&apos;s the difference between Operion
                    and a SmartSheet or Airtable you configure from scratch.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Pricing */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm">
                Start with a 14-day free trial. No credit card required. Setup fees include
                white-glove onboarding.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-8 lg:grid-cols-2 max-w-3xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <ScrollReveal key={plan.name} delay={i * 100}>
                <div
                  className={`relative rounded-xl border-0 bg-[#111111] flex flex-col h-full card-glow${
                    plan.highlighted ? " ring-2 ring-violet-400/30" : " border border-white/[0.04]"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-0 right-0 flex justify-center">
                      <span className="inline-flex items-center rounded-full bg-violet-400/20 text-violet-300 text-xs px-3 py-0.5 font-medium backdrop-blur-sm">
                        Most popular
                      </span>
                    </div>
                  )}
                  <div className="p-6 pb-4">
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                    <div className="mt-3 space-y-0.5">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Setup</span>
                        <div>
                          <span className="text-2xl font-bold tracking-tight">{plan.setupFee}</span>
                          <span className="text-sm text-muted-foreground ml-1">one-time</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly</span>
                        <div>
                          <span className="text-2xl font-bold tracking-tight">{plan.price}</span>
                          <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 pb-4 flex-1">
                    <ul className="space-y-2.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2.5 text-sm">
                          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {plan.excluded.map((feature) => (
                        <li key={feature} className="flex items-center gap-2.5 text-sm text-muted-foreground/40">
                          <Check className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="px-6 pb-6 mt-auto">
                    <Link
                      href="/pricing"
                      className={`inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-10 px-4 w-full transition-all ${
                        plan.highlighted
                          ? "bg-foreground text-background hover:bg-foreground/90 hover:shadow-[0_0_20px_rgba(250,250,250,0.1)]"
                          : "border border-[#262626] bg-[#1a1a1a] hover:bg-[#222] hover:border-white/[0.08]"
                      }`}
                    >
                      Start Free Trial
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/pricing"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View full pricing details →
            </Link>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto">
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

        {/* Who It's For */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Who it&apos;s for
              </h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm">
                Purpose-built for the people who keep multiple businesses running.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
            {personas.map((persona, i) => (
              <ScrollReveal key={persona.title} delay={i * 100}>
                <div className="card-glow group rounded-xl bg-[#111111] border border-white/[0.04] p-6 text-center cursor-default">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/[0.04] mx-auto mb-4 group-hover:bg-violet-400/10 group-hover:scale-110 transition-all duration-300">
                    <persona.icon className="h-6 w-6 text-foreground/50 group-hover:text-violet-400 transition-colors duration-300" />
                  </div>
                  <h3 className="text-sm font-semibold mb-2">{persona.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                    {persona.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Social Proof / Trust Bar */}
        <ScrollReveal>
          <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
            <div className="rounded-xl bg-[#0d0d0d] border border-white/[0.04] max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row items-center justify-center divide-y sm:divide-y-0 sm:divide-x divide-white/[0.04]">
                {trustPoints.map((point) => (
                  <div
                    key={point.title}
                    className="flex items-center gap-3 px-6 py-4 w-full sm:w-auto justify-center"
                  >
                    <point.icon className="h-4 w-4 text-foreground/40 shrink-0" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {point.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* FAQ */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Frequently asked questions
              </h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm">
                Quick answers to common questions.
              </p>
            </div>
          </ScrollReveal>

          <div className="max-w-2xl mx-auto space-y-3">
            {faqItems.map((faq, i) => (
              <ScrollReveal key={faq.question} delay={i * 80}>
                <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-5 card-glow cursor-default">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="h-4 w-4 text-violet-400/70 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold mb-1.5">{faq.question}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <ScrollReveal>
          <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
            <div className="rounded-2xl bg-[#111111] border border-white/[0.04] p-8 sm:p-16 text-center max-w-2xl mx-auto relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full bg-violet-500/[0.03] blur-[80px] pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-400/10 mb-6">
                  <img src="/logo.svg" alt="" className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3">
                  Ready to see everything in one place?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm">
                  Explore Operion with a pre-loaded portfolio. See how AI keeps
                  your entire portfolio organized in one dashboard.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/api/demo"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium h-12 px-8 w-full sm:w-auto transition-all hover:bg-foreground/90 hover:shadow-[0_0_30px_rgba(250,250,250,0.12)]"
                  >
                    <Play className="h-4 w-4" />
                    Explore the Product
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#262626] bg-[#1a1a1a] text-sm font-medium h-12 px-8 w-full sm:w-auto transition-all hover:bg-[#222]"
                  >
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Footer */}
        <footer className="border-t border-white/[0.04]">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="Operion" className="h-5 w-5 opacity-50" />
                <span className="text-xs text-muted-foreground">
                  &copy; {new Date().getFullYear()} Operion
                </span>
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
                <Link
                  href="/help"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Help
                </Link>
                <Link
                  href="/terms"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms
                </Link>
                <Link
                  href="/privacy"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
