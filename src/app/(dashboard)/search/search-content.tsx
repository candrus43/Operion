"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  CheckSquare,
  FolderKanban,
  Building2,
  FileText,
  Users,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchResult {
  id: string
  title: string
  subtitle: string
  type: "task" | "project" | "entity" | "document" | "contact"
  link: string
}

interface SearchResults {
  tasks: SearchResult[]
  projects: SearchResult[]
  entities: SearchResult[]
  documents: SearchResult[]
  contacts: SearchResult[]
}

const sectionConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; accent: string }> = {
  tasks: { label: "Tasks", icon: CheckSquare, accent: "text-violet-400" },
  projects: { label: "Projects", icon: FolderKanban, accent: "text-emerald-400" },
  entities: { label: "Entities", icon: Building2, accent: "text-blue-400" },
  documents: { label: "Documents", icon: FileText, accent: "text-sky-400" },
  contacts: { label: "Contacts", icon: Users, accent: "text-rose-400" },
}

export function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""
  const [query, setQuery] = useState(initialQuery)
  const [inputValue, setInputValue] = useState(initialQuery)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery)
    }
  }, [initialQuery])

  async function performSearch(q: string) {
    if (!q.trim()) return

    setLoading(true)
    setError(null)
    setQuery(q)

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
      if (!response.ok) throw new Error("Search failed")
      const data = await response.json()
      setResults(data.results)
    } catch (err) {
      setError("Search failed. Please try again.")
      console.error("Search error:", err)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (inputValue.trim()) {
      const url = new URL(window.location.href)
      url.searchParams.set("q", inputValue.trim())
      window.history.pushState({}, "", url.toString())
      performSearch(inputValue.trim())
    }
  }

  const totalResults = results
    ? results.tasks.length + results.projects.length + results.entities.length + results.documents.length + results.contacts.length
    : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Search header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-4">Search</h1>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search across tasks, projects, entities, documents, contacts..."
              className="pl-11 pr-24 py-6 text-base bg-[#111111] border-white/[0.06] rounded-2xl focus-visible:ring-violet-500/20 placeholder:text-muted-foreground/50"
              autoFocus
            />
            <Button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 rounded-xl bg-white text-black hover:bg-white/90 text-sm font-medium"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">{error}</p>
        </div>
      )}

      {/* Results */}
      {!loading && results && (
        <>
          {totalResults === 0 ? (
            <div className="text-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111111] border border-white/[0.04] mx-auto mb-4">
                <Search className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground mb-1">
                No results found
              </h3>
              <p className="text-sm text-muted-foreground/60">
                No results found for &apos;<span className="text-foreground/70">{query}</span>&apos;
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground mb-4">
                {totalResults} result{totalResults !== 1 ? "s" : ""} for &quot;{query}&quot;
              </p>

              {Object.entries(sectionConfig).map(([key, config]) => {
                const items = results[key as keyof SearchResults] as SearchResult[]
                if (items.length === 0) return null

                const Icon = config.icon

                return (
                  <div key={key} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={cn("h-4 w-4", config.accent)} />
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {config.label}
                      </h2>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/[0.06]">
                        {items.length}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {items.map((item) => (
                        <Link
                          key={item.id}
                          href={item.link}
                          className="flex items-center gap-3 rounded-xl bg-[#111111] hover:bg-[#1a1a1a] border border-white/[0.03] hover:border-white/[0.06] px-4 py-3 transition-all group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-white transition-colors">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-0.5">
                              {item.subtitle}
                            </p>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-foreground/40 transition-colors shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Empty initial state */}
      {!loading && !results && !initialQuery && (
        <div className="text-center py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111111] border border-white/[0.04] mx-auto mb-4">
            <Search className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground mb-1">
            Search across your portfolio
          </h3>
          <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto">
            Search tasks, projects, entities, documents, and contacts — all in one place.
          </p>
        </div>
      )}
    </div>
  )
}
