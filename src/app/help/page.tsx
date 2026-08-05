"use client"

import { useState } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/layout/page-header"
import { BookOpen, MessageCircle, Mail, ChevronDown } from "lucide-react"

const faqs = [
  {
    q: "How do I add a new entity?",
    a: "Click 'Entities' in the sidebar, then 'New Entity'. Choose the type (business, property, investment, etc.), give it a name, and you're set. Your AI briefing will automatically include it."
  },
  {
    q: "What does the AI briefing do?",
    a: "When you log in, the AI scans all your entities, projects, and tasks to surface what needs your attention — overdue deadlines, stalled projects, and upcoming decisions. It prioritizes so you don't have to dig through lists."
  },
  {
    q: "How do I invite team members?",
    a: "Go to Settings → Team. Enter their email and choose a role. They'll get an invitation link. You can set permissions per person — owners see everything, staff see assigned work."
  },
  {
    q: "Can I connect Google or Microsoft accounts?",
    a: "Yes. In Settings, you can link your Google or Microsoft account for calendar sync and single sign-on. OAuth is available for both providers."
  },
  {
    q: "How does billing work?",
    a: "Operion offers Solo ($249/mo) and Team ($499/mo) plans, each with a one-time setup fee. Both include unlimited entities. You can start a free 14-day trial with no credit card required."
  },
  {
    q: "What integrations are available?",
    a: "You can import data via CSV or ICS files from the Import page. Google and Microsoft calendar sync is available. Stripe handles all billing. More integrations are on the roadmap."
  },
]

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        eyebrow="Support"
        title="Help & Documentation"
        description="Guides, FAQs, and support resources for Operion."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/blog" className="rounded-xl glass border border-white/[0.06] p-6 space-y-3 hover:border-white/[0.12] hover:bg-white/[0.02] transition-all cursor-pointer">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <BookOpen className="h-5 w-5 text-blue-400" />
          </div>
          <h3 className="font-semibold">Getting Started Guide</h3>
          <p className="text-sm text-muted-foreground">
            Learn the basics — setting up entities, creating tasks, and using the AI briefing.
          </p>
        </Link>

        <button
          onClick={() => setOpenFaq(openFaq !== null ? null : 0)}
          className="rounded-xl glass border border-white/[0.06] p-6 space-y-3 text-left hover:border-white/[0.12] hover:bg-white/[0.02] transition-all cursor-pointer"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
            <MessageCircle className="h-5 w-5 text-violet-400" />
          </div>
          <h3 className="font-semibold">FAQs</h3>
          <p className="text-sm text-muted-foreground">
            Common questions about teams, billing, integrations, and entity management.
          </p>
        </button>
      </div>

      {openFaq !== null && (
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl glass border border-white/[0.06] overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-medium text-sm">{faq.q}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <a
        href="mailto:Hello@Operion.Online"
        className="block rounded-xl glass border border-white/[0.06] p-6 space-y-3 hover:border-white/[0.12] hover:bg-white/[0.02] transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <Mail className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold">Need more help?</h3>
            <p className="text-sm text-muted-foreground">
              Reach out to our support team at Hello@Operion.Online
            </p>
          </div>
        </div>
      </a>
    </div>
  )
}
