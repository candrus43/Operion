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
  Check,
  Home,
  Briefcase,
  Building,
  Sparkles,
} from "lucide-react"
import {
  Atmosphere,
  CinematicNav,
  DashboardShowcase,
  FaqAccordion,
  FloatingChip,
  HeadlineGlow,
  Parallax,
  Reveal,
  ScrollCue,
  ScrollProgressBar,
} from "@/components/cinematic"

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
    title: "Enterprise-grade security",
    description:
      "Your portfolio is protected with security practices designed for modern businesses.",
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
    description: "Download all your organization data as JSON — no lock-in, ever.",
  },
  {
    icon: Clock,
    title: "14-day free trial",
    description: "Try everything with no credit card required. Cancel anytime.",
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
    description: "For the owner who runs everything personally.",
    features: [
      "1 user seat",
      "Unlimited entities",
      "AI daily briefing",
      "Task & project management",
      "Document & contact center",
      "Full-text document search",
      "EA workspace",
      "White-glove setup included",
    ],
    excluded: ["Team access & delegation", "Role-based permissions", "Audit trail"],
    highlighted: false,
  },
  {
    name: "Team",
    setupFee: "$5,000",
    price: "$499",
    period: "/month",
    description: "For owners who delegate to an EA, ops manager, or staff.",
    features: [
      "Up to 5 user seats",
      "Everything in Solo, plus:",
      "Delegate tasks with assignments & deadlines",
      "Role-based permissions — limit what each person sees",
      "Full audit trail — every change logged by person & time",
      "Team AI briefing — priorities distributed across staff",
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

/* ---------------------------------------------------------------- shared UI */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="h-px w-8 bg-gradient-to-r from-transparent to-violet-400/50" />
      <span className="eyebrow text-white/40">{children}</span>
      <span className="h-px w-8 bg-gradient-to-l from-transparent to-violet-400/50" />
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="grain relative min-h-screen overflow-x-clip bg-[#08080a] text-white antialiased">
      <ScrollProgressBar />
      <CinematicNav />

      <main className="relative">
        {/* ================================================================
            HERO
           ================================================================ */}
        <section className="relative flex min-h-[100svh] items-center overflow-hidden pt-28 pb-20">
          <Atmosphere />
          <div className="grid-fade pointer-events-none absolute inset-0" />
          {/* Horizon line */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#08080a] via-[#08080a]/80 to-transparent" />

          <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <div
                className="rise-in inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 backdrop-blur-md"
                style={{ animationDelay: "80ms" }}
              >
                <Sparkles className="h-3 w-3 text-violet-300" />
                <span className="text-[12px] tracking-[0.01em] text-white/60">
                  AI Chief of Staff for entrepreneurs
                </span>
              </div>

              <h1
                className="rise-in display relative mt-9 text-[2.25rem] sm:text-[4.25rem] lg:text-[5.75rem]"
                style={{ animationDelay: "200ms" }}
              >
                <HeadlineGlow />
                <span className="text-gradient-dim block">Your AI Chief of Staff</span>
                <span className="text-gradient-violet animate-hue-slide mt-1 block sm:mt-2">
                  for every business you run.
                </span>
              </h1>

              <p
                className="rise-in mx-auto mt-8 max-w-2xl text-[15px] leading-[1.75] text-white/45 sm:text-[17px]"
                style={{ animationDelay: "360ms" }}
              >
                Operion scans every entity, surfaces risks, and tells you what to do next —
                so you can run your entire portfolio from one dashboard, without anything
                falling through the cracks.
              </p>

              <div
                className="rise-in mt-11 flex flex-col items-center justify-center gap-3 sm:flex-row"
                style={{ animationDelay: "500ms" }}
              >
                <Link
                  href="/demo-login"
                  className="group inline-flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full bg-white px-9 text-[15px] font-medium tracking-[-0.01em] text-black transition-all duration-500 hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] sm:w-auto"
                >
                  <Play className="h-4 w-4 transition-transform duration-500 group-hover:scale-110" />
                  Explore the Product
                </Link>
                <Link
                  href="/register?redirect=/home"
                  className="group inline-flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full border border-white/[0.12] bg-white/[0.03] px-9 text-[15px] font-medium tracking-[-0.01em] text-white backdrop-blur-md transition-all duration-500 hover:border-violet-400/40 hover:bg-white/[0.06] sm:w-auto"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
                </Link>
              </div>

              <p
                className="rise-in mt-6 text-[12px] tracking-[0.02em] text-white/25"
                style={{ animationDelay: "620ms" }}
              >
                14-day free trial · No credit card required
              </p>
            </div>

            <div
              className="rise-in mt-20 hidden justify-center sm:flex"
              style={{ animationDelay: "820ms" }}
            >
              <ScrollCue />
            </div>
          </div>
        </section>

        {/* ================================================================
            ENTITY TYPES
           ================================================================ */}
        <section className="relative border-y border-white/[0.05] bg-[#0a0a0d] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Reveal>
              <p className="eyebrow text-center text-white/30">
                Built for operators who manage
              </p>
            </Reveal>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {entityTypes.map((item, i) => (
                <Reveal key={item.label} delay={i * 90} direction="up" distance={26}>
                  <div className="glass lift-sm group flex items-center gap-3 rounded-full px-4 py-3 sm:px-6 sm:py-3.5">
                    <item.icon className="h-4 w-4 shrink-0 text-violet-300/60 transition-colors duration-500 group-hover:text-violet-300" />
                    <span className="whitespace-nowrap text-[13px] tracking-[-0.005em] text-white/55 transition-colors duration-500 group-hover:text-white/85">
                      {item.label}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            HOW IT WORKS
           ================================================================ */}
        <section className="relative overflow-hidden py-28 sm:py-40">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[38rem] w-[70rem] max-w-[160vw] -translate-x-1/2 rounded-full bg-violet-700/[0.07] blur-[160px]" />

          <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
            <Reveal>
              <SectionLabel>How it works</SectionLabel>
            </Reveal>
            <Reveal delay={90}>
              <h2 className="display-tight mx-auto mt-7 max-w-3xl text-center text-[2rem] sm:text-[3.25rem]">
                <span className="text-gradient-dim">Scattered information in.</span>
                <br />
                <span className="text-white/40">A clear plan out.</span>
              </h2>
            </Reveal>

            <div className="mt-20 grid gap-8 sm:grid-cols-3 sm:gap-6">
              {steps.map((step, i) => (
                <Reveal
                  key={step.title}
                  delay={i * 160}
                  direction={i === 0 ? "left" : i === 2 ? "right" : "up"}
                  distance={i === 1 ? 50 : 70}
                >
                  <div className="glass lift group relative h-full overflow-hidden rounded-3xl p-8">
                    <span className="ghost-numeral pointer-events-none absolute -right-2 -top-6 text-[7rem] leading-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.08] to-transparent transition-all duration-700 group-hover:border-violet-400/30 group-hover:from-violet-400/15">
                        <step.icon className="h-5 w-5 text-white/55 transition-colors duration-700 group-hover:text-violet-300" />
                      </div>
                      <h3 className="mt-7 text-[17px] font-medium tracking-[-0.015em] text-white">
                        {step.title}
                      </h3>
                      <p className="mt-3 text-[14px] leading-[1.7] text-white/40">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            DASHBOARD SHOWCASE — the hero shot
           ================================================================ */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#08080a] via-[#0b0a12] to-[#08080a] py-24 sm:py-36">
          <div className="grid-fade pointer-events-none absolute inset-0 opacity-60" />

          <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
            <Reveal>
              <SectionLabel>The dashboard</SectionLabel>
            </Reveal>
            <Reveal delay={90}>
              <h2 className="display-tight mx-auto mt-7 max-w-3xl text-center text-[2rem] sm:text-[3.25rem]">
                <span className="text-gradient-dim">Everything you own.</span>{" "}
                <span className="text-gradient-violet">One screen.</span>
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mx-auto mt-6 max-w-xl text-center text-[15px] leading-[1.75] text-white/40">
                Your AI briefing — priorities, risks, and next actions across every entity,
                waiting for you before you ask.
              </p>
            </Reveal>

            <div className="relative mt-20">
              {/* Floating parallax chips */}
              <div className="pointer-events-none absolute -left-4 top-24 z-20 hidden xl:block">
                <FloatingChip label="Daily briefing" value="Ready at 6:00 AM" speed={0.22} />
              </div>
              <div className="pointer-events-none absolute -right-4 top-64 z-20 hidden xl:block">
                <FloatingChip label="Entities tracked" value="Unlimited" speed={-0.16} />
              </div>
              <div className="pointer-events-none absolute -left-2 bottom-16 z-20 hidden xl:block">
                <FloatingChip label="Risks surfaced" value="Cross-entity" speed={0.3} />
              </div>

              <div className="mx-auto max-w-4xl">
                <DashboardShowcase />
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            FEATURES
           ================================================================ */}
        <section className="relative py-28 sm:py-40">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Reveal>
              <SectionLabel>Capabilities</SectionLabel>
            </Reveal>
            <Reveal delay={90}>
              <h2 className="display-tight mx-auto mt-7 max-w-3xl text-center text-[2rem] sm:text-[3.25rem]">
                <span className="text-gradient-dim">
                  Everything you need to run your portfolio
                </span>
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mx-auto mt-6 max-w-xl text-center text-[15px] leading-[1.75] text-white/40">
                Built for owners managing multiple entities who are tired of scattered
                spreadsheets, overflowing inboxes, and things falling through the cracks.
              </p>
            </Reveal>

            <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <Reveal
                  key={feature.title}
                  delay={(i % 3) * 120}
                  direction="up"
                  distance={54}
                  className={i === 0 ? "sm:col-span-2 lg:col-span-2" : ""}
                >
                  <div className="glass lift group relative h-full overflow-hidden rounded-3xl p-8">
                    <div
                      className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/[0.14] opacity-0 blur-[60px] transition-opacity duration-700 group-hover:opacity-100"
                      aria-hidden
                    />
                    <div className="relative">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-gradient-to-br from-white/[0.08] to-transparent transition-all duration-700 group-hover:border-violet-400/30 group-hover:from-violet-400/15">
                        <feature.icon className="h-[18px] w-[18px] text-white/55 transition-colors duration-700 group-hover:text-violet-300" />
                      </div>
                      <h3
                        className={`mt-6 font-medium tracking-[-0.02em] text-white ${
                          i === 0 ? "text-[22px] sm:text-[26px]" : "text-[17px]"
                        }`}
                      >
                        {feature.title}
                      </h3>
                      <p
                        className={`mt-3 leading-[1.7] text-white/40 ${
                          i === 0 ? "max-w-md text-[15px]" : "text-[14px]"
                        }`}
                      >
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            DONE-FOR-YOU SETUP
           ================================================================ */}
        <section className="relative overflow-hidden border-y border-white/[0.05] bg-[#0a0a0d] py-28 sm:py-40">
          <Parallax speed={0.08} className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[30rem] w-[60rem] max-w-[150vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.1] blur-[150px]" />
          </Parallax>

          <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
            <Reveal direction="scale">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/10 backdrop-blur-md">
                <Plug className="h-6 w-6 text-violet-300" />
              </div>
            </Reveal>
            <Reveal delay={120}>
              <h2 className="display-tight mt-10 text-[2rem] sm:text-[3.5rem]">
                <span className="text-gradient-dim">We set everything</span>{" "}
                <span className="text-gradient-violet">up for you.</span>
              </h2>
            </Reveal>
            <Reveal delay={220}>
              <div className="hairline mx-auto mt-10 w-40" />
            </Reveal>
            <Reveal delay={300}>
              <p className="mx-auto mt-10 max-w-xl text-[15px] leading-[1.85] text-white/45 sm:text-[16px]">
                Your setup fee includes white-glove onboarding. We configure your entities,
                import your spreadsheets, organize your documents, and train your team. You
                walk into a fully operational AI Chief of Staff — not an empty tool you have
                to build yourself. That&apos;s the difference between Operion and a
                SmartSheet or Airtable you configure from scratch.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ================================================================
            PRICING
           ================================================================ */}
        <section className="relative py-28 sm:py-40">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Reveal>
              <SectionLabel>Pricing</SectionLabel>
            </Reveal>
            <Reveal delay={90}>
              <h2 className="display-tight mx-auto mt-7 max-w-2xl text-center text-[2rem] sm:text-[3.25rem]">
                <span className="text-gradient-dim">Simple, transparent pricing</span>
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mx-auto mt-6 max-w-xl text-center text-[15px] leading-[1.75] text-white/40">
                Start with a 14-day free trial — no credit card required. Upgrade after your trial
                when you’re ready for white-glove onboarding.
              </p>
            </Reveal>

            <div className="mx-auto mt-20 grid max-w-4xl gap-6 lg:grid-cols-2">
              {pricingPlans.map((plan, i) => (
                <Reveal
                  key={plan.name}
                  delay={i * 140}
                  direction={i === 0 ? "left" : "right"}
                  distance={60}
                  className="h-full"
                >
                  <div
                    className={`relative flex h-full flex-col overflow-hidden rounded-3xl p-8 ${
                      plan.highlighted
                        ? "ring-gradient glass-deep shadow-[0_40px_100px_-40px_rgba(124,58,237,0.55)] lg:-translate-y-3"
                        : "glass lift"
                    }`}
                  >
                    {plan.highlighted && (
                      <>
                        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-violet-500/20 blur-[80px]" />
                        <div className="relative mb-6 flex justify-start">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1 text-[11px] font-medium tracking-[0.04em] text-violet-200">
                            <Sparkles className="h-3 w-3" />
                            Most popular
                          </span>
                        </div>
                      </>
                    )}

                    <div className="relative">
                      <h3 className="text-[22px] font-medium tracking-[-0.02em] text-white">
                        {plan.name}
                      </h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-white/40">
                        {plan.description}
                      </p>

                      <div className="mt-8 flex items-end gap-8">
                        <div>
                          <div className="eyebrow text-[9px] text-white/30">Setup</div>
                          <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="display text-[2rem] text-white">
                              {plan.setupFee}
                            </span>
                            <span className="text-[12px] text-white/35">one-time</span>
                          </div>
                        </div>
                        <div className="hairline-v h-12 self-center" />
                        <div>
                          <div className="eyebrow text-[9px] text-white/30">Monthly</div>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="display text-[2rem] text-white">
                              {plan.price}
                            </span>
                            <span className="text-[12px] text-white/35">{plan.period}</span>
                          </div>
                        </div>
                      </div>

                      <div className="my-8 h-px bg-white/[0.06]" />

                      <ul className="space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-3 text-[14px]">
                            <Check className="h-[15px] w-[15px] shrink-0 text-violet-300/80" />
                            <span className="text-white/70">{feature}</span>
                          </li>
                        ))}
                        {plan.excluded.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-center gap-3 text-[14px] text-white/20"
                          >
                            <Check className="h-[15px] w-[15px] shrink-0" />
                            <span className="line-through decoration-white/15">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="relative mt-10 pt-2">
                      <Link
                        href="/register?redirect=/home"
                        className={`group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-medium tracking-[-0.01em] transition-all duration-500 ${
                          plan.highlighted
                            ? "bg-white text-black hover:shadow-[0_0_40px_rgba(255,255,255,0.28)]"
                            : "border border-white/[0.12] bg-white/[0.04] text-white hover:border-violet-400/40 hover:bg-white/[0.07]"
                        }`}
                      >
                        Start Free Trial
                        <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={200}>
              <div className="mt-12 text-center">
                <Link
                  href="/pricing"
                  className="group inline-flex items-center gap-1.5 text-[13px] text-white/35 transition-colors hover:text-white"
                >
                  View full pricing details
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================================================================
            TRUST
           ================================================================ */}
        <section className="relative border-y border-white/[0.05] bg-[#0a0a0d] py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Reveal>
              <h2 className="display-tight text-center text-[1.75rem] sm:text-[2.5rem]">
                <span className="text-gradient-dim">Your data belongs to you</span>
              </h2>
            </Reveal>
            <div className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trustPoints.map((point, i) => (
                <Reveal key={point.title} delay={i * 110} distance={40}>
                  <div className="glass lift-sm group h-full rounded-2xl p-6">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04]">
                      <point.icon className="h-4 w-4 text-white/45 transition-colors duration-500 group-hover:text-violet-300" />
                    </div>
                    <h3 className="mt-5 text-[14px] font-medium tracking-[-0.01em] text-white">
                      {point.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-[1.65] text-white/35">
                      {point.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            WHO IT'S FOR
           ================================================================ */}
        <section className="relative overflow-hidden py-28 sm:py-40">
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-[26rem] w-[56rem] max-w-[150vw] -translate-x-1/2 rounded-full bg-indigo-700/[0.07] blur-[150px]" />
          <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
            <Reveal>
              <SectionLabel>Who it&apos;s for</SectionLabel>
            </Reveal>
            <Reveal delay={90}>
              <h2 className="display-tight mx-auto mt-7 max-w-2xl text-center text-[2rem] sm:text-[3.25rem]">
                <span className="text-gradient-dim">
                  For the people who keep empires running
                </span>
              </h2>
            </Reveal>

            <div className="mx-auto mt-20 grid max-w-5xl gap-5 sm:grid-cols-3">
              {personas.map((persona, i) => (
                <Reveal
                  key={persona.title}
                  delay={i * 150}
                  direction={i === 0 ? "left" : i === 2 ? "right" : "up"}
                  distance={60}
                >
                  <div className="glass lift group h-full rounded-3xl p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.08] to-transparent transition-all duration-700 group-hover:border-violet-400/30 group-hover:from-violet-400/15">
                      <persona.icon className="h-6 w-6 text-white/50 transition-colors duration-700 group-hover:text-violet-300" />
                    </div>
                    <h3 className="mt-7 text-[17px] font-medium tracking-[-0.015em] text-white">
                      {persona.title}
                    </h3>
                    <p className="mx-auto mt-3 max-w-[240px] text-[14px] leading-[1.7] text-white/40">
                      {persona.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            TRUST BAR
           ================================================================ */}
        <section className="relative pb-28 sm:pb-40">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Reveal direction="scale">
              <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-xl">
                <div className="flex flex-col divide-y divide-white/[0.05] sm:flex-row sm:divide-x sm:divide-y-0">
                  {trustPoints.map((point) => (
                    <div
                      key={point.title}
                      className="flex flex-1 items-center justify-center gap-3 px-6 py-5"
                    >
                      <point.icon className="h-[15px] w-[15px] shrink-0 text-violet-300/50" />
                      <span className="whitespace-nowrap text-[12px] tracking-[0.01em] text-white/45">
                        {point.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================================================================
            FAQ
           ================================================================ */}
        <section className="relative border-t border-white/[0.05] bg-[#0a0a0d] py-28 sm:py-40">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Reveal>
              <SectionLabel>Questions</SectionLabel>
            </Reveal>
            <Reveal delay={90}>
              <h2 className="display-tight mx-auto mt-7 max-w-2xl text-center text-[2rem] sm:text-[3.25rem]">
                <span className="text-gradient-dim">Frequently asked questions</span>
              </h2>
            </Reveal>

            <div className="mx-auto mt-16 max-w-2xl">
              <Reveal delay={160}>
                <FaqAccordion items={faqItems} />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================================================================
            FINAL CTA
           ================================================================ */}
        <section className="relative overflow-hidden py-36 sm:py-52">
          <Atmosphere particles={false} fade={false} />
          <div className="grid-fade pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />

          <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
            <Reveal direction="scale">
              <div className="animate-breathe pointer-events-none absolute left-1/2 top-1/3 -z-10 h-72 w-[40rem] max-w-[130vw] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[130px]" />
              <img src="/logo.png" alt="" className="mx-auto h-11 w-11 opacity-90" />
            </Reveal>

            <Reveal delay={120}>
              <h2 className="display mt-12 text-[2.25rem] sm:text-[4rem]">
                <span className="text-gradient-dim">Ready to see everything</span>
                <br />
                <span className="text-gradient-violet">in one place?</span>
              </h2>
            </Reveal>

            <Reveal delay={230}>
              <p className="mx-auto mt-8 max-w-md text-[15px] leading-[1.75] text-white/45">
                Explore Operion with a pre-loaded portfolio. See how AI keeps your entire
                portfolio organized in one dashboard.
              </p>
            </Reveal>

            <Reveal delay={340}>
              <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/demo-login"
                  className="group inline-flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full bg-white px-9 text-[15px] font-medium tracking-[-0.01em] text-black transition-all duration-500 hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] sm:w-auto"
                >
                  <Play className="h-4 w-4 transition-transform duration-500 group-hover:scale-110" />
                  Explore the Product
                </Link>
                <Link
                  href="/register?redirect=/home"
                  className="group inline-flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full border border-white/[0.12] bg-white/[0.03] px-9 text-[15px] font-medium tracking-[-0.01em] text-white backdrop-blur-md transition-all duration-500 hover:border-violet-400/40 hover:bg-white/[0.06] sm:w-auto"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ==================================================================
          FOOTER
         ================================================================== */}
      <footer className="relative border-t border-white/[0.06] bg-[#08080a]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-10 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Operion" className="h-6 w-6" />
                <span className="text-[15px] font-medium tracking-[-0.02em] text-white">
                  Operion
                </span>
              </div>
              <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-white/30">
                The AI Chief of Staff for entrepreneurs running more than one business.
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-x-8 gap-y-3">
              {[
                { href: "/pricing", label: "Pricing" },
                { href: "/login", label: "Sign In" },
                { href: "/blog", label: "Blog" },
                { href: "/help", label: "Help" },
                { href: "/terms", label: "Terms" },
                { href: "/privacy", label: "Privacy" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[13px] text-white/40 transition-colors duration-300 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/[0.05] pt-8 sm:flex-row sm:items-center">
            <span className="text-[12px] text-white/25">
              &copy; {new Date().getFullYear()} Operion. All rights reserved.
            </span>
            <span className="text-[12px] text-white/25">
              14-day free trial · No credit card required
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
