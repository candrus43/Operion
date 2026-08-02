import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, Calendar, Clock } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { getAllPosts, getPostBySlug } from "@/lib/blog"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.filter((p) => !p.placeholder).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  return {
    title: `${post.title} — Operion Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `https://operion.ctonew.app/blog/${post.slug}`,
      siteName: "Operion",
    },
    alternates: {
      canonical: `https://operion.ctonew.app/blog/${post.slug}`,
    },
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const allPosts = getAllPosts().filter((p) => !p.placeholder)
  const currentIndex = allPosts.findIndex((p) => p.slug === slug)
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null

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

      {/* Article */}
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blog
        </Link>

        {/* Header */}
        <header className="mb-10">
          <span className="inline-flex items-center rounded-full border border-white/[0.06] bg-[#1a1a1a] px-3 py-1 text-xs font-medium text-violet-400/80 mb-4">
            {post.category}
          </span>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl leading-[1.2] mb-4">
            {post.title}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            {post.description}
          </p>
          <div className="flex items-center gap-4 mt-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(post.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {post.readTime}
            </span>
          </div>
        </header>

        {/* Divider */}
        <div className="border-t border-white/[0.06] mb-10" />

        {/* Content */}
        <div className="blog-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content || ""}
          </ReactMarkdown>
        </div>

        {/* Post footer */}
        <div className="border-t border-white/[0.06] mt-12 pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {prevPost && (
                <Link
                  href={`/blog/${prevPost.slug}`}
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <div>
                    <span className="block text-[11px] text-muted-foreground/60">Previous</span>
                    <span className="group-hover:text-violet-300 transition-colors">{prevPost.title}</span>
                  </div>
                </Link>
              )}
            </div>
            <div className="text-right">
              {nextPost && (
                <Link
                  href={`/blog/${nextPost.slug}`}
                  className="group flex items-center justify-end gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div>
                    <span className="block text-[11px] text-muted-foreground/60">Next</span>
                    <span className="group-hover:text-violet-300 transition-colors">{nextPost.title}</span>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </article>

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

      {/* Structured Data: BlogPosting */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            url: `https://operion.ctonew.app/blog/${post.slug}`,
            publisher: {
              "@type": "Organization",
              name: "Operion",
              url: "https://operion.ctonew.app",
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://operion.ctonew.app/blog/${post.slug}`,
            },
          }),
        }}
      />
    </div>
  )
}
