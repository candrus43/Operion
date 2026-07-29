"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Globe,
  Upload,
  Pencil,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Loader2,
  Check,
  Mail,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DiscoveryFeed, type DiscoveryItem } from "./discovery-feed"

type OnboardingState = "landing" | "quick-start-input" | "discovery" | "google-connected"

interface QuickStartResponse {
  summary: { entities: number; contacts: number; projects: number; tasks: number }
  created: {
    entities: { id: string; name: string }[]
    contacts: any[]
    projects: { id: string; name: string }[]
    tasks: { id: string; title: string }[]
  }
  errors?: string[]
}

export function WelcomeScreen({ userName }: { userName: string }) {
  const firstName = userName?.split(" ")[0] || "there"
  const { data: session } = useSession()
  const router = useRouter()

  const [state, setState] = useState<OnboardingState>(() => {
    if ((session?.user as any)?.googleConnected) return "google-connected"
    return "landing"
  })
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discoveryItems, setDiscoveryItems] = useState<DiscoveryItem[]>([])
  const [entityProgress, setEntityProgress] = useState(0)
  const [contactProgress, setContactProgress] = useState(0)
  const [taskProgress, setTaskProgress] = useState(0)
  const [entityTotal, setEntityTotal] = useState(0)
  const [contactTotal, setContactTotal] = useState(0)
  const [taskTotal, setTaskTotal] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Check for Google connected status
  useEffect(() => {
    if ((session?.user as any)?.googleConnected && state === "landing") {
      setState("google-connected")
    }
  }, [session, state])

  // Focus textarea when entering quick-start mode
  useEffect(() => {
    if (state === "quick-start-input" && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [state])

  const buildDiscoveryItems = (result: QuickStartResponse): DiscoveryItem[] => {
    const items: DiscoveryItem[] = [
      { id: "scan-1", icon: "scanning", text: "Analyzing your business description..." },
    ]

    if (result.created.entities.length > 0) {
      for (const entity of result.created.entities) {
        items.push({
          id: `entity-${entity.id}`,
          icon: "entity",
          text: `Found ${entity.name}`,
        })
      }
    }

    if (result.created.contacts.length > 0) {
      items.push({
        id: "contacts-summary",
        icon: "contact",
        text: `Found ${result.created.contacts.length} contact${result.created.contacts.length > 1 ? "s" : ""} across your entities`,
      })
    }

    if (result.created.projects.length > 0) {
      items.push({
        id: "projects-summary",
        icon: "project",
        text: `Found ${result.created.projects.length} active project${result.created.projects.length > 1 ? "s" : ""}`,
      })
    }

    if (result.created.tasks.length > 0) {
      items.push({
        id: "tasks-summary",
        icon: "task",
        text: `Found ${result.created.tasks.length} task${result.created.tasks.length > 1 ? "s" : ""}`,
      })
    }

    items.push({
      id: "complete",
      icon: "complete",
      text: "Building your command center...",
    })

    return items
  }

  const handleQuickStart = useCallback(async () => {
    if (!description.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    setState("discovery")

    // Show scanning immediately
    setDiscoveryItems([{ id: "scan-1", icon: "scanning", text: "Analyzing your business description..." }])
    setEntityProgress(5)
    setContactProgress(5)
    setTaskProgress(5)

    try {
      const res = await fetch("/api/ai/quick-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || "Failed to process your description")
      }

      const result: QuickStartResponse = await res.json()
      const total = result.summary.entities + result.summary.contacts + result.summary.projects + result.summary.tasks

      setEntityTotal(result.summary.entities)
      setContactTotal(result.summary.contacts)
      setTaskTotal(result.summary.projects + result.summary.tasks)

      // Build discovery items
      const items = buildDiscoveryItems(result)
      setDiscoveryItems(items)

      // Set final progress
      setTimeout(() => {
        setEntityProgress(result.summary.entities > 0 ? 100 : 100)
        setContactProgress(result.summary.contacts > 0 ? 100 : 100)
        setTaskProgress(result.summary.projects + result.summary.tasks > 0 ? 100 : 100)
      }, 300)
    } catch (err: any) {
      setError(err.message || "Something went wrong")
      setState("quick-start-input")
    } finally {
      setIsSubmitting(false)
    }
  }, [description, isSubmitting])

  const handleDiscoveryComplete = useCallback(() => {
    router.refresh()
  }, [router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleQuickStart()
    }
  }

  const googleConnected = (session?.user as any)?.googleConnected

  // ── Discovery State ───────────────────────────────────────────
  if (state === "discovery") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="mb-6">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-blue-500/20 ring-1 ring-white/[0.06]">
            <Sparkles className="h-7 w-7 text-amber-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Building your command center
        </h2>
        <p className="text-sm text-muted-foreground mb-10">
          We&apos;re extracting your business structure from your description
        </p>

        <DiscoveryFeed
          items={discoveryItems}
          entityProgress={entityProgress}
          contactProgress={contactProgress}
          taskProgress={taskProgress}
          entityTotal={entityTotal}
          contactTotal={contactTotal}
          taskTotal={taskTotal}
          onComplete={handleDiscoveryComplete}
        />
      </div>
    )
  }

  // ── Google Connected State ─────────────────────────────────────
  if (state === "google-connected") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-green-500/10 blur-3xl scale-150" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500/10 ring-1 ring-green-500/20">
            <Check className="h-9 w-9 text-green-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Google connected
        </h1>
        <p className="text-muted-foreground max-w-md mb-2">
          Nice to meet you, {firstName}. Your Google account is connected.
        </p>
        <p className="text-sm text-muted-foreground max-w-md mb-10">
          Import your first spreadsheet or tell us about your business to get started.
        </p>

        <div className="grid gap-4 w-full max-w-md">
          {/* Upload card */}
          <button
            onClick={() => router.push("/import")}
            className="group relative rounded-xl bg-[#111111] border border-white/[0.04] p-5 text-left hover:bg-[#151515] hover:border-white/[0.08] transition-all w-full"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                <Upload className="h-5 w-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold">Upload a spreadsheet</h3>
                <p className="text-xs text-muted-foreground">Excel · CSV · PDF</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
            </div>
          </button>

          {/* Tell us card */}
          <button
            onClick={() => setState("quick-start-input")}
            className="group relative rounded-xl bg-[#111111] border border-white/[0.04] p-5 text-left hover:bg-[#151515] hover:border-white/[0.08] transition-all w-full"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Pencil className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold">Tell us about your business</h3>
                <p className="text-xs text-muted-foreground">Type one sentence</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
            </div>
          </button>
        </div>

        {/* Start from scratch */}
        <button
          onClick={() => router.refresh()}
          className="mt-8 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
        >
          Start from scratch
        </button>
      </div>
    )
  }

  // ── Quick-Start Input State ────────────────────────────────────
  if (state === "quick-start-input") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="w-full max-w-lg">
          {/* Back button */}
          <button
            onClick={() => {
              setState("landing")
              setDescription("")
              setError(null)
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            ← Back
          </button>

          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Tell us about your business
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Describe what you manage in one sentence. Our AI will build your command center.
          </p>

          <div className="space-y-4">
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder='I run Riverside Hotel, ABC Corp, and a gas station on Main St. I also have a commercial property at 456 Oak.'
              rows={4}
              className="w-full rounded-xl bg-[#111111] border border-white/[0.06] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30 resize-none transition-all"
              disabled={isSubmitting}
            />

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              onClick={handleQuickStart}
              disabled={!description.trim() || isSubmitting}
              className={cn(
                "inline-flex items-center justify-center gap-2 w-full rounded-lg text-sm font-medium h-11 px-6 transition-all",
                description.trim() && !isSubmitting
                  ? "bg-amber-500 text-black hover:bg-amber-400"
                  : "bg-[#1a1a1a] text-muted-foreground cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Go
                  <span className="text-xs opacity-50 ml-1">⌘↵</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Start from scratch */}
        <button
          onClick={() => router.refresh()}
          className="mt-8 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
        >
          Start from scratch
        </button>
      </div>
    )
  }

  // ── Landing State ──────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      {/* Branded glow */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-3xl scale-150" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-blue-500/20 ring-1 ring-white/[0.06]">
          <img src="/logo.svg" className="h-9 w-9" alt="Operion" />
        </div>
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Let&apos;s build your command center
      </h1>
      <p className="text-muted-foreground max-w-md mb-2">
        Welcome, {firstName}. Choose how you&apos;d like to get started.
      </p>
      <p className="text-xs text-muted-foreground mb-10">
        We&apos;ll automatically organize everything into entities, projects, and tasks.
      </p>

      {/* Option cards */}
      <div className="grid gap-3 w-full max-w-md mb-10">
        {/* Connect Google — primary card */}
        <button
          onClick={() => signIn("google")}
          className="group relative rounded-xl bg-[#111111] border border-amber-500/20 p-5 text-left hover:bg-[#151515] hover:border-amber-500/30 transition-all w-full overflow-hidden"
        >
          {/* Subtle highlight ring */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/5 to-transparent" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Globe className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Connect Google</h3>
                <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                  ⚡ Fastest
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Gmail · Calendar · Drive</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all -translate-x-1 group-hover:translate-x-0" />
          </div>
        </button>

        {/* Connect Microsoft */}
        <button
          onClick={() => signIn("microsoft-entra-id")}
          className="group relative rounded-xl bg-[#111111] border border-[#0078D4]/20 p-5 text-left hover:bg-[#151515] hover:border-[#0078D4]/30 transition-all w-full overflow-hidden"
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0078D4]/5 to-transparent" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0078D4]/10">
              <Mail className="h-5 w-5 text-[#0078D4]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">Connect Microsoft</h3>
              <p className="text-xs text-muted-foreground">Outlook · Calendar · OneDrive</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all -translate-x-1 group-hover:translate-x-0" />
          </div>
        </button>

        {/* Upload spreadsheet */}
        <button
          onClick={() => router.push("/import")}
          className="group relative rounded-xl bg-[#111111] border border-white/[0.04] p-5 text-left hover:bg-[#151515] hover:border-white/[0.08] transition-all w-full"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <Upload className="h-5 w-5 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">Upload a spreadsheet</h3>
              <p className="text-xs text-muted-foreground">Excel · CSV · PDF</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all -translate-x-1 group-hover:translate-x-0" />
          </div>
        </button>

        {/* Tell us about your business */}
        <button
          onClick={() => setState("quick-start-input")}
          className="group relative rounded-xl bg-[#111111] border border-white/[0.04] p-5 text-left hover:bg-[#151515] hover:border-white/[0.08] transition-all w-full"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Pencil className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">Tell us about your business</h3>
              <p className="text-xs text-muted-foreground">Type one sentence</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all -translate-x-1 group-hover:translate-x-0" />
          </div>
        </button>
      </div>

      {/* Progress indicator — 0% completion */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        0% complete
      </div>

      {/* Start from scratch */}
      <button
        onClick={() => router.refresh()}
        className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors underline underline-offset-4"
      >
        Start from scratch
      </button>
    </div>
  )
}
