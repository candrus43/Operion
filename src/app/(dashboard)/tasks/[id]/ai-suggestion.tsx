"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Loader2, Key } from "lucide-react"
import { notifyTaskChanged } from "@/lib/task-events-client"

interface AISuggestionProps {
  taskId: string
  existingSuggestion: string | null
  /** ISO timestamp of when the cached suggestion was generated (Phase 1d). */
  generatedAt?: string | null
}

function generatedLabel(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (mins < 1) return "Generated just now"
  if (mins < 60) return `Generated ${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Generated ${hrs}h ago`
  if (hrs < 24 * 7) return `Generated ${Math.floor(hrs / 24)}d ago`
  return `Generated ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
}

export function AISuggestion({ taskId, existingSuggestion, generatedAt }: AISuggestionProps) {
  const [suggestion, setSuggestion] = useState<string | null>(existingSuggestion)
  const [genTime, setGenTime] = useState<string | null>(generatedAt || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [auto, setAuto] = useState(false)
  const autoStarted = useRef(false)

  async function generateSuggestion({ automatic = false }: { automatic?: boolean } = {}) {
    setLoading(true)
    setError(null)
    if (automatic) setAuto(true)
    try {
      const response = await fetch("/api/ai/suggest-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 503) {
          setError("AI features require an OpenAI API key. Add OPENAI_API_KEY to continue.")
        } else {
          setError(data.message || "Failed to generate suggestion.")
        }
        return
      }

      setSuggestion(data.suggestion)
      if (data.generatedAt) setGenTime(data.generatedAt)
      notifyTaskChanged() // surface AI_REFRESH in the activity feed
    } catch {
      setError("Unable to connect. Please try again.")
    } finally {
      setLoading(false)
      setAuto(false)
    }
  }

  // Phase 1d: auto-generate ONCE when there's no cached suggestion (cheap;
  // cached afterwards, so it won't regenerate on every visit).
  useEffect(() => {
    if (autoStarted.current) return
    if (existingSuggestion === null && typeof window !== "undefined") {
      autoStarted.current = true
      generateSuggestion({ automatic: true })
    }
  }, [existingSuggestion]) // eslint-disable-line react-hooks/exhaustive-deps

  const label = generatedLabel(genTime)

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          AI Suggestions
          {label && <span className="text-[10px] text-muted-foreground/70 font-normal">{label}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {suggestion ? (
          <div className="rounded-xl bg-violet-500/5 border border-violet-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 mt-0.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/90 leading-relaxed">{suggestion}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-1">AI-generated — verify before acting.</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => generateSuggestion()}
                  disabled={loading}
                  className="mt-1.5 h-7 text-xs text-muted-foreground hover:text-violet-400 gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Regenerate
                </Button>
              </div>
            </div>
          </div>
        ) : auto ? (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
            <p className="text-sm text-muted-foreground">Generating your AI suggestion…</p>
          </div>
        ) : error ? (
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 mt-0.5">
                <Key className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-amber-300/80 mb-2">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => generateSuggestion()}
                  disabled={loading}
                  className="h-7 text-xs text-muted-foreground hover:text-amber-400"
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 mb-3">
              <Sparkles className="h-5 w-5 text-violet-400" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">AI-powered task insights</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Get smart suggestions on next steps, deadlines, and blockers.
            </p>
            <Button
              onClick={() => generateSuggestion()}
              disabled={loading}
              variant="outline"
              size="sm"
              className="gap-1.5 border-violet-500/20 text-violet-400 hover:text-violet-300 hover:bg-violet-500/5"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Suggestion
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
