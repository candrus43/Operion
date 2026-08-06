"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react"
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react"

/* -------------------------------------------------------------------------
   Motion utilities
   ------------------------------------------------------------------------- */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return reduced
}

/* -------------------------------------------------------------------------
   Shared rAF-throttled scroll loop.

   ONE module-level rAF dispatcher drives every subscriber, so a page with
   many scroll-reactive components (Atmosphere, Parallax, progress bar,
   nav, dashboard showcase) never stacks multiple rAF loops or duplicate
   window listeners. A single scroll/resize listener is registered on the
   first subscribe and torn down on the last unsubscribe.

   On mobile (<768px) the loop is throttled to ~30fps by skipping every
   other rAF tick, halving the per-frame measurement work.
   ------------------------------------------------------------------------- */

// Subscribers are refs so the latest handler is always called without
// re-subscribing on every render (same pattern as the original hook).
const rafSubscribers = new Set<{ current: () => void }>()

let rafFrame = 0 // non-zero while a frame is scheduled
let rafMobile = false
let rafMobileTick = 0 // toggles on mobile to skip every other frame

function rafRun() {
  rafFrame = 0
  if (rafMobile) {
    rafMobileTick ^= 1
    if (rafMobileTick === 1) return // skip every other frame → ~30fps
  }
  // Each subscriber does its own measurement (getBoundingClientRect etc.)
  // inside its callback — the shared loop only dispatches.
  rafSubscribers.forEach((cb) => cb.current())
}

function rafSchedule() {
  rafMobile = window.innerWidth < 768
  if (!rafFrame) rafFrame = requestAnimationFrame(rafRun)
}

function rafStop() {
  if (rafFrame) {
    cancelAnimationFrame(rafFrame)
    rafFrame = 0
  }
}

/** Shared rAF-throttled scroll subscription — one loop drives all listeners. */
function useRafScroll(handler: () => void) {
  const cb = useRef(handler)
  cb.current = handler
  useEffect(() => {
    const first = rafSubscribers.size === 0
    rafSubscribers.add(cb)
    if (first) {
      window.addEventListener("scroll", rafSchedule, { passive: true })
      window.addEventListener("resize", rafSchedule)
    }
    cb.current() // immediate first measurement so initial paint is correct
    return () => {
      rafSubscribers.delete(cb)
      if (rafSubscribers.size === 0) {
        window.removeEventListener("scroll", rafSchedule)
        window.removeEventListener("resize", rafSchedule)
        rafStop()
        rafMobileTick = 0
      }
    }
  }, [])
}

/**
 * Progress (0 → 1) of an element travelling through the viewport.
 * 0 when its top edge touches the bottom of the viewport,
 * 1 once it has risen to roughly the upper third.
 */
function useElementProgress(ref: RefObject<HTMLElement | null>, span = 0.85) {
  const [progress, setProgress] = useState(0)
  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight || 1
    const raw = (vh - rect.top) / (vh * span)
    setProgress(Math.min(1, Math.max(0, raw)))
  }, [ref, span])
  useRafScroll(measure)
  return progress
}

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)"

type Direction = "up" | "down" | "left" | "right" | "scale" | "none"

const OFFSETS: Record<Direction, (d: number) => string> = {
  up: (d) => `translate3d(0, ${d}px, 0)`,
  down: (d) => `translate3d(0, ${-d}px, 0)`,
  left: (d) => `translate3d(${-d}px, 0, 0)`,
  right: (d) => `translate3d(${d}px, 0, 0)`,
  scale: () => "scale(0.94)",
  none: () => "none",
}

/**
 * Weighted, deliberate scroll reveal — fades, shifts and de-blurs.
 * Replaces the old bouncy `ScrollReveal` on the landing page.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  distance = 44,
  duration = 1100,
  blur = 8,
  threshold = 0.12,
}: {
  children: ReactNode
  className?: string
  delay?: number
  direction?: Direction
  distance?: number
  duration?: number
  blur?: number
  threshold?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  const style: CSSProperties = reduced
    ? {}
    : {
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : OFFSETS[direction](distance),
        filter: visible ? "blur(0px)" : `blur(${blur}px)`,
        transition: `opacity ${duration}ms ${EASE} ${delay}ms, transform ${duration}ms ${EASE} ${delay}ms, filter ${duration}ms ${EASE} ${delay}ms`,
        willChange: visible ? "auto" : "opacity, transform",
      }

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  )
}

/** Layer that drifts against the scroll direction. speed > 0 moves slower than page. */
export function Parallax({
  children,
  speed = 0.12,
  className = "",
}: {
  children: ReactNode
  speed?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useRafScroll(() => {
    if (reduced) return
    const el = ref.current
    const target = inner.current
    if (!el || !target) return
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight || 1
    const centerDelta = rect.top + rect.height / 2 - vh / 2
    target.style.transform = `translate3d(0, ${(-centerDelta * speed).toFixed(2)}px, 0)`
  })

  return (
    <div ref={ref} className={className}>
      <div ref={inner} style={{ willChange: "transform" }}>
        {children}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------
   Chrome: scroll progress + navigation
   ------------------------------------------------------------------------- */

export function ScrollProgressBar() {
  const [pct, setPct] = useState(0)
  useRafScroll(() => {
    const doc = document.documentElement
    const total = doc.scrollHeight - doc.clientHeight
    setPct(total > 0 ? (doc.scrollTop / total) * 100 : 0)
  })
  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-px bg-transparent">
      <div
        className="h-full origin-left bg-gradient-to-r from-violet-400 via-indigo-400 to-sky-400"
        style={{ width: `${pct}%`, transition: "width 120ms linear" }}
      />
    </div>
  )
}

const NAV_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Sign In" },
]

export function CinematicNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useRafScroll(() => setScrolled(window.scrollY > 16))

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-700 ${
        scrolled
          ? "border-b border-white/[0.06] bg-[#08080a]/70 backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div
          className={`flex items-center justify-between transition-all duration-700 ${
            scrolled ? "h-14" : "h-20"
          }`}
        >
          <Link href="/" className="group flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Operion"
              className="h-7 w-7 transition-transform duration-700 group-hover:scale-110"
            />
            <span className="text-[15px] font-medium tracking-[-0.02em]">Operion</span>
          </Link>

          <div className="hidden items-center gap-1 sm:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-2 text-[13px] text-white/60 transition-colors duration-300 hover:bg-white/[0.05] hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/demo-login"
              className="ml-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-white px-5 text-[13px] font-medium text-black transition-all duration-500 hover:shadow-[0_0_32px_rgba(255,255,255,0.28)]"
            >
              Explore the Product
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 sm:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div
        className={`grid overflow-hidden border-white/[0.06] bg-[#08080a]/95 backdrop-blur-xl transition-all duration-500 sm:hidden ${
          open ? "grid-rows-[1fr] border-t" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
          <div className="flex flex-col gap-1 px-5 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/[0.04] hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/demo-login"
              onClick={() => setOpen(false)}
              className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white text-sm font-medium text-black"
            >
              Explore the Product
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

/* -------------------------------------------------------------------------
   Hero atmosphere
   ------------------------------------------------------------------------- */

function Particles() {
  const dots = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: `${(i * 37 + 11) % 100}%`,
        bottom: `${-(i * 13) % 40}%`,
        size: i % 5 === 0 ? 2.5 : 1.5,
        duration: 18 + ((i * 7) % 22),
        delay: -((i * 5) % 26),
        violet: i % 3 === 0,
      })),
    []
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d) => (
        <span
          key={d.id}
          className="animate-drift absolute rounded-full"
          style={{
            left: d.left,
            bottom: d.bottom,
            width: d.size,
            height: d.size,
            background: d.violet ? "rgba(167,139,250,0.55)" : "rgba(255,255,255,0.35)",
            boxShadow: d.violet ? "0 0 8px rgba(167,139,250,0.6)" : "none",
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

/** Layered aurora + particles. Drifts slowly against the scroll. */
export function Atmosphere({
  particles = true,
  fade = true,
}: {
  particles?: boolean
  fade?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useRafScroll(() => {
    if (reduced) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight || 1
    // How far this section's own top has travelled past the top of the viewport.
    const past = Math.max(0, -rect.top)
    el.style.transform = `translate3d(0, ${(past * 0.18).toFixed(1)}px, 0)`
    if (fade) {
      const visible = 1 - Math.min(1, past / (vh * 1.1))
      el.style.opacity = String(0.25 + visible * 0.75)
    }
  })

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ willChange: "transform, opacity" }}
    >
      <div className="aurora-a absolute -left-[15%] top-[-18%] h-[46rem] w-[46rem] rounded-full bg-violet-600/[0.16] blur-[80px] md:blur-[150px]" />
      <div className="aurora-b absolute -right-[12%] top-[6%] h-[38rem] w-[38rem] rounded-full bg-indigo-500/[0.13] blur-[70px] md:blur-[140px]" />
      <div className="aurora-c absolute bottom-[-22%] left-[28%] h-[34rem] w-[34rem] rounded-full bg-sky-500/[0.09] blur-[60px] md:blur-[130px]" />
      {particles && <Particles />}
    </div>
  )
}

/** Slow-pulsing radial glow that sits behind the hero headline. */
export function HeadlineGlow() {
  return (
    <div
      className="animate-breathe pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[24rem] w-[52rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[110px] sm:max-w-[130vw]"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(139,92,246,0.4) 0%, rgba(96,165,250,0.16) 45%, transparent 72%)",
      }}
    />
  )
}

export function ScrollCue() {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="eyebrow text-[9px] text-white/25">Scroll</span>
      <div className="relative h-12 w-px overflow-hidden bg-white/10">
        <div className="animate-scroll-cue absolute inset-x-0 h-6 bg-gradient-to-b from-transparent via-violet-300 to-transparent" />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------
   Dashboard hero shot — 3D frame that rotates flat as it enters
   ------------------------------------------------------------------------- */

export function DashboardShowcase() {
  const ref = useRef<HTMLDivElement>(null)
  const progress = useElementProgress(ref, 0.95)
  const reduced = usePrefersReducedMotion()

  const p = reduced ? 1 : progress
  const eased = 1 - Math.pow(1 - p, 3)
  const rotateX = (1 - eased) * 16
  const scale = 0.88 + eased * 0.12
  const translateY = (1 - eased) * 56
  const glow = eased

  return (
    <div ref={ref} className="relative px-2 sm:px-0">
      {/* Floor glow */}
      <div
        className="pointer-events-none absolute inset-x-[8%] bottom-[-6%] h-40 rounded-[50%] blur-[80px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(139,92,246,0.55) 0%, rgba(96,165,250,0.2) 45%, transparent 70%)",
          opacity: 0.12 + glow * 0.5,
          transition: "opacity 300ms linear",
        }}
      />

      <div style={{ perspective: "2000px", perspectiveOrigin: "50% 0%" }}>
        <div
          className="ring-gradient relative overflow-hidden rounded-[18px] bg-[#0b0b0e] shadow-[0_60px_140px_-50px_rgba(0,0,0,0.95)]"
          style={{
            transform: `translate3d(0, ${translateY.toFixed(1)}px, 0) rotateX(${rotateX.toFixed(2)}deg) scale(${scale.toFixed(4)})`,
            transformOrigin: "50% 0%",
            willChange: "transform",
          }}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-white/[0.05] bg-gradient-to-b from-[#17171b] to-[#101013] px-2 py-3 sm:gap-3 sm:px-4">
            <div className="flex shrink-0 gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/70" />
            </div>
            <div className="flex flex-1 justify-center">
              <div className="flex h-6 w-64 max-w-[60%] items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03]">
                <span className="font-mono text-[10px] tracking-wide text-white/35">
                  747f7260a6742ead05417bb94870b599.ctonew.app
                </span>
              </div>
            </div>
            <div className="w-6 shrink-0 sm:w-12" />
          </div>

          {/* Screenshot */}
          <div className="relative">
            <img
              src="/dashboard-preview.png"
              alt="The Operion dashboard showing an AI daily briefing across every entity"
              className="w-full select-none"
              draggable={false}
            />
            {/* Cover the demo user's topbar */}
            <div className="absolute inset-x-0 top-0 z-10 h-[44px] bg-[#0b0b0e]" />
            {/* Sheen sweep */}
            <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
              <div className="animate-sheen absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>
            {/* Bottom vignette */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-[#08080a] to-transparent" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Small stat chips that float beside the dashboard on wide screens. */
export function FloatingChip({
  label,
  value,
  className = "",
  speed = 0.16,
}: {
  label: string
  value: string
  className?: string
  speed?: number
}) {
  return (
    <Parallax speed={speed} className={className}>
      <div className="glass-deep rounded-2xl px-5 py-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]">
        <div className="text-[11px] uppercase tracking-[0.16em] text-white/35">{label}</div>
        <div className="mt-1.5 text-lg font-medium tracking-[-0.02em] text-white">{value}</div>
      </div>
    </Parallax>
  )
}

/* -------------------------------------------------------------------------
   FAQ accordion
   ------------------------------------------------------------------------- */

export function FaqAccordion({
  items,
}: {
  items: { question: string; answer: string }[]
}) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-xl">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left transition-colors duration-300 hover:bg-white/[0.02]"
            >
              <span
                className={`text-[15px] font-medium tracking-[-0.01em] transition-colors duration-300 ${
                  isOpen ? "text-white" : "text-white/75"
                }`}
              >
                {item.question}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-all duration-500 ${
                  isOpen ? "rotate-180 text-violet-300" : "text-white/30"
                }`}
              />
            </button>
            <div
              className="grid transition-all duration-500"
              style={{
                gridTemplateRows: isOpen ? "1fr" : "0fr",
                transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
              }}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="px-6 pb-6 pr-14 text-sm leading-relaxed text-white/50">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
