import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, Calendar, Clock } from "lucide-react"
import { getAllPosts, type BlogPost } from "@/lib/blog"

export const metadata: Metadata = {
  title: "Operion Blog — Insights on Multi-Entity Management & AI for Entrepreneurs",
  description:
    "Practical guides, honest comparisons, and strategic insights for entrepreneurs running multiple companies, properties, and investments. Written for owners who need decisions, not fluff.",
  openGraph: {
    title: "Operion Blog — Multi-Entity Management & AI Insights",
    description:
      "For entrepreneurs running multiple companies. Practical guides on portfolio management, AI-powered operations, and building systems that scale across entities.",
    url: "https://operion.ctonew.app/blog",
    siteName: "Operion",
    type: "website",
  },
  alternates: {
    canonical: "https://operion.ctonew.app/blog",
  },
}

const CATEGORIES = [
  "Multi-Entity Strategy",
  "AI & Operations",
  "Comparisons",
  "Operator Stories",
]

// Placeholder posts from the content spec
const PLACEHOLDER_POSTS = [
  {
    title: "How to Run Your Portfolio Like a COO, Not a Hobbyist",
    category: "Multi-Entity Strategy",
    readTime: "6 min read",
    description:
      "The systems and rhythms that separate operators who scale from owners who drown in details.",
  },
  {
    title: "What AI Can (and Can't) Do for Your Business Portfolio",
    category: "AI & Operations",
    readTime: "5 min read",
    description:
      "Cutting through the hype: a practical framework for where AI adds real value in multi-entity operations.",
  },
  {
    title: "The Morning Briefing: How Top Operators Start Their Day",
    category: "Operator Stories",
    readTime: "7 min read",
    description:
      "Patterns from entrepreneurs who run 5+ entities — how they triage, prioritize, and act before noon.",
  },
]

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

export default function BlogIndexPage() {
  const livePosts = getAllPosts()

  // Merge live + placeholder, sorted by date (live first, then placeholders)
  const allPosts: (BlogPost | (typeof PLACEHOLDER_POSTS)[number] & { isPlaceholder: true })[] = [
    ...livePosts,
    ...PLACEHOLDER_POSTS.map((p) => ({ ...p, isPlaceholder: true as const, slug: "", date: "", description: p.description })),
  ]

  // Primary featured = first live post, secondary = next 2
  const featuredPrimary = livePosts[0] || null
  const featuredSecondary = livePosts.slice(1, 3)

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Navigation */}
      <header className="border-b border-white/[0.04] backdrop-blur-sm bg-[#080808]/80 sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img src="/logo.svg" alt="Operion" className="h-8 w-8 group-hover:opacity-90 transition-opacity" />
              <span className="text-base font-semibold tracking-tight">Operion</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/blog"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium text-foreground h-9 px-3 transition-colors"
              >
                Blog
              </Link>
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
                href="/demo-login"
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
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-10 sm:px-6 sm:pt-24 sm:pb-14 lg:px-8">
        <div className="mx-auto max-w-3xl text-center space-y-5">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl leading-[1.15]">
            Not another SaaS blog.
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed sm:text-lg">
            We write for entrepreneurs running multiple companies — the ones who don't have time for "10 productivity tips" listicles. Every piece answers one question:{" "}
            <em className="text-foreground/80">what would an AI Chief of Staff tell you about this?</em>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/demo-login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium h-10 px-6 transition-all hover:bg-foreground/90"
            >
              Explore the product
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#262626] bg-[#111111] text-sm font-medium h-10 px-6 transition-all hover:bg-[#1a1a1a]"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button className="rounded-full border border-white/[0.08] bg-[#111111] px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-[#1a1a1a]">
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className="rounded-full border border-white/[0.04] bg-transparent px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-[#111111] hover:text-foreground"
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Featured Posts */}
      {featuredPrimary && (
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">
            Featured
          </h2>

          {/* Primary Feature */}
          <Link
            href={`/blog/${featuredPrimary.slug}`}
            className="group block rounded-2xl border border-white/[0.06] bg-[#111111] overflow-hidden hover:border-white/[0.1] transition-all duration-300 mb-4"
          >
            <div className="p-6 sm:p-8">
              <span className="inline-flex items-center rounded-full border border-white/[0.06] bg-[#1a1a1a] px-3 py-1 text-xs font-medium text-violet-400/80 mb-4">
                {featuredPrimary.category}
              </span>
              <h3 className="text-xl font-bold tracking-tight sm:text-2xl mb-3 group-hover:text-violet-300 transition-colors">
                {featuredPrimary.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-4">
                {featuredPrimary.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(featuredPrimary.date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {featuredPrimary.readTime}
                </span>
              </div>
            </div>
          </Link>

          {/* Secondary Features */}
          {featuredSecondary.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {featuredSecondary.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block rounded-xl border border-white/[0.04] bg-[#111111] p-5 sm:p-6 hover:border-white/[0.08] transition-all duration-300"
                >
                  <span className="inline-flex items-center rounded-full border border-white/[0.04] bg-[#1a1a1a] px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground mb-3">
                    {post.category}
                  </span>
                  <h3 className="text-base font-semibold mb-2 group-hover:text-violet-300 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    {post.description}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {formatDate(post.date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {post.readTime}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* All Posts */}
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
        <h2 className="text-lg font-bold tracking-tight mb-6">All posts</h2>
        <div className="space-y-3">
          {livePosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-white/[0.04] bg-[#111111] p-5 hover:border-white/[0.08] transition-all duration-300"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] text-muted-foreground">{post.category}</span>
                  <span className="text-[11px] text-muted-foreground/50">·</span>
                  <span className="text-[11px] text-muted-foreground">{post.readTime}</span>
                </div>
                <h3 className="text-sm font-semibold group-hover:text-violet-300 transition-colors">
                  {post.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-2">
                  {post.description}
                </p>
              </div>
              <div className="shrink-0">
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))}

          {/* Placeholder posts */}
          {PLACEHOLDER_POSTS.map((post) => (
            <div
              key={post.title}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-white/[0.02] bg-[#0d0d0d] p-5 opacity-60"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] text-muted-foreground">{post.category}</span>
                  <span className="text-[11px] text-muted-foreground/50">·</span>
                  <span className="text-[11px] text-muted-foreground">{post.readTime}</span>
                  <span className="text-[11px] text-muted-foreground/50">·</span>
                  <span className="text-[11px] text-muted-foreground/60 italic">Coming soon</span>
                </div>
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {post.title}
                </h3>
                <p className="text-xs text-muted-foreground/60 leading-relaxed mt-1 line-clamp-2">
                  {post.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl bg-[#111111] border border-white/[0.04] p-8 sm:p-10 text-center">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl mb-3">
              One email. What to pay attention to this week.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-md mx-auto">
              We send a short briefing every week on multi-entity operations, AI for owners, and the patterns we're seeing across portfolios. No fluff. No "growth hacks." Just what actually matters for running multiple companies.
            </p>
            <form
              className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto"
              action="#"
            >
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 h-10 rounded-lg border border-[#262626] bg-[#1a1a1a] px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-white/[0.15] transition-colors"
              />
              <button
                type="submit"
                className="h-10 rounded-lg bg-foreground text-background text-sm font-medium px-5 transition-all hover:bg-foreground/90"
              >
                Subscribe
              </button>
            </form>
            <p className="text-[11px] text-muted-foreground/60 mt-3">
              Sent every Tuesday. Unsubscribe anytime. We never share your data.
            </p>
          </div>
        </div>
      </section>

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
              <Link href="/blog" className="text-xs text-foreground transition-colors">
                Blog
              </Link>
              <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Structured Data: Blog */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "Operion Blog",
            description:
              "Practical guides, honest comparisons, and strategic insights for entrepreneurs running multiple companies, properties, and investments.",
            url: "https://operion.ctonew.app/blog",
            publisher: {
              "@type": "Organization",
              name: "Operion",
              url: "https://operion.ctonew.app",
            },
          }),
        }}
      />
    </div>
  )
}
