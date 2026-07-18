"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Loader2, Key } from "lucide-react"

interface AISuggestionProps {
  taskId: string
  existingSuggestion: string | null
}

export function AISuggestion({ taskId, existingSuggestion }: AISuggestionProps) {
  const [suggestion, setSuggestion] = useState<string | null>(existingSuggestion)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generateSuggestion() {
    setLoading(true)
    setError(null)
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
    } catch {
      setError("Unable to connect. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-0 bg-[#111111]">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          AI Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {suggestion ? (
          <div className="rounded-xl bg-violet-500/5 border border-violet-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 mt-0.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-foreground/90 leading-relaxed">{suggestion}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateSuggestion}
                  disabled={loading}
                  className="mt-3 h-7 text-xs text-muted-foreground hover:text-violet-400 gap-1.5"
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
                  onClick={generateSuggestion}
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
              onClick={generateSuggestion}
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
