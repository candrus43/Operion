"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  PenLine,
  Sparkles,
  Calendar,
  Send,
  Clipboard,
  Trash2,
  Archive,
  Globe,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Post {
  id: string
  title: string
  body: string
  status: string
  platform: string
  scheduledDate: string | null
  publishedDate: string | null
  createdAt: string
  updatedAt: string
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  SCHEDULED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PUBLISHED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  ARCHIVED: "bg-zinc-700/10 text-zinc-600 border-zinc-700/20",
}

export function ContentHub({ initialPosts }: { initialPosts: Post[] }) {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [topic, setTopic] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generatedPost, setGeneratedPost] = useState<{ title: string; body: string } | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editBody, setEditBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [publishingBlog, setPublishingBlog] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [calendarOffset, setCalendarOffset] = useState(0) // weeks offset from now
  const [scheduleModal, setScheduleModal] = useState<{ postId: string; currentDate: string | null } | null>(null)
  const [scheduleDate, setScheduleDate] = useState("")

  // ── Generate AI Post ──────────────────────────────────────────
  const generatePost = useCallback(async () => {
    if (!topic.trim()) return
    setGenerating(true)
    setGeneratedPost(null)
    try {
      const res = await fetch("/api/admin/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      })
      if (!res.ok) throw new Error("Generation failed")
      const data = await res.json()
      setGeneratedPost({ title: data.title, body: data.body })
      setEditTitle(data.title)
      setEditBody(data.body)
    } catch (err) {
      console.error("Generate error:", err)
    } finally {
      setGenerating(false)
    }
  }, [topic])

  // ── Save as Draft ─────────────────────────────────────────────
  const saveDraft = useCallback(async () => {
    if (!editTitle.trim() || !editBody.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          body: editBody.trim(),
          status: "DRAFT",
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      const newPost = await res.json()
      setPosts((prev) => [newPost, ...prev])
      setGeneratedPost(null)
      setTopic("")
      setEditTitle("")
      setEditBody("")
      router.refresh()
    } catch (err) {
      console.error("Save error:", err)
    } finally {
      setSaving(false)
    }
  }, [editTitle, editBody, router])

  // ── Schedule Post ────────────────────────────────────────────
  const schedulePost = useCallback(async () => {
    if (!editTitle.trim() || !editBody.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          body: editBody.trim(),
          status: "SCHEDULED",
          scheduledDate: scheduleDate || undefined,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      const newPost = await res.json()
      setPosts((prev) => [newPost, ...prev])
      setGeneratedPost(null)
      setTopic("")
      setEditTitle("")
      setEditBody("")
      router.refresh()
    } catch (err) {
      console.error("Schedule error:", err)
    } finally {
      setSaving(false)
    }
  }, [editTitle, editBody, scheduleDate, router])

  // ── Update Post Status ────────────────────────────────────────
  const updateStatus = useCallback(async (id: string, status: string, scheduledDate?: string | null) => {
    try {
      const res = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, scheduledDate }),
      })
      if (!res.ok) throw new Error("Update failed")
      const updated = await res.json()
      setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)))
      router.refresh()
    } catch (err) {
      console.error("Update error:", err)
    }
  }, [router])

  // ── Delete Post ──────────────────────────────────────────────
  const deletePost = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/content?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setPosts((prev) => prev.filter((p) => p.id !== id))
      router.refresh()
    } catch (err) {
      console.error("Delete error:", err)
    }
  }, [router])

  // ── Copy to Clipboard ────────────────────────────────────────
  const copyToClipboard = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  // ── Publish to Blog ──────────────────────────────────────────
  const publishToBlog = useCallback(async (id: string) => {
    setPublishingBlog(id)
    try {
      const res = await fetch("/api/admin/content/publish-to-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed")
      }
      // Mark as published
      await updateStatus(id, "PUBLISHED", null)
    } catch (err: any) {
      console.error("Publish to blog error:", err)
    } finally {
      setPublishingBlog(null)
    }
  }, [updateStatus])

  // ── Calendar Helpers ──────────────────────────────────────────
  const today = new Date()
  const calStartDate = new Date(today)
  calStartDate.setDate(today.getDate() - today.getDay() + calendarOffset * 7)

  const weekDays: { date: Date; label: string }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(calStartDate)
    d.setDate(calStartDate.getDate() + i)
    weekDays.push({ date: d, label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) })
  }

  const getPostsForDay = (date: Date) => {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)
    return posts.filter((p) => {
      if (!p.scheduledDate) return false
      const sd = new Date(p.scheduledDate)
      return sd >= dayStart && sd <= dayEnd
    })
  }

  const todayStr = today.toDateString()

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content Hub</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage Operion&apos;s LinkedIn content and blog posts.</p>
      </div>

      {/* AI Post Generator */}
      <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold">AI Post Generator</h2>
        </div>

        <div className="flex gap-3">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Type a topic, e.g. &quot;announce our new onboarding feature&quot; or &quot;how AI helps entrepreneurs manage multiple businesses&quot;"
            className="flex-1 min-h-[60px] rounded-lg bg-[#0a0a0a] border border-white/[0.06] px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.15] resize-none"
            rows={2}
            disabled={generating}
          />
          <Button
            onClick={generatePost}
            disabled={!topic.trim() || generating}
            className="shrink-0 h-auto py-3"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>

        {/* Generated Post Preview */}
        {generatedPost && (
          <div className="mt-4 rounded-lg bg-[#0a0a0a] border border-white/[0.06] p-4 space-y-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
              placeholder="Post title"
            />
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="w-full min-h-[120px] bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed"
            />
            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
              <Button size="sm" onClick={saveDraft} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <PenLine className="h-3.5 w-3.5 mr-1.5" />}
                Save Draft
              </Button>
              <div className="flex items-center gap-1 ml-2">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="h-8 rounded-lg bg-[#111111] border border-white/[0.06] px-2 text-xs text-zinc-300 focus:outline-none focus:border-white/[0.15]"
                />
                <Button size="sm" variant="secondary" onClick={schedulePost} disabled={saving || !scheduleDate}>
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  Schedule
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={() => {
                  setGeneratedPost(null)
                  setEditTitle("")
                  setEditBody("")
                }}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Discard
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Content Calendar */}
      <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold">Content Calendar</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setCalendarOffset((o) => o - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => setCalendarOffset(0)}
            >
              Today
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setCalendarOffset((o) => o + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayPosts = getPostsForDay(day.date)
            const isToday = day.date.toDateString() === todayStr
            const isPast = day.date < new Date(todayStr)
            return (
              <div
                key={day.date.toISOString()}
                className={cn(
                  "rounded-lg border p-2 min-h-[120px]",
                  isToday ? "border-amber-500/30 bg-amber-500/[0.03]" :
                  isPast ? "border-white/[0.03] bg-[#0a0a0a]/50" :
                  "border-white/[0.05] bg-[#0a0a0a]/30"
                )}
              >
                <div className={cn(
                  "text-[10px] font-medium mb-2",
                  isToday ? "text-amber-400" : "text-zinc-500"
                )}>
                  {day.date.toLocaleDateString("en-US", { weekday: "short" })}
                  <span className="ml-1 text-zinc-600">{day.date.getDate()}</span>
                </div>
                <div className="space-y-1">
                  {dayPosts.map((post) => (
                    <div
                      key={post.id}
                      className={cn(
                        "text-[10px] px-1.5 py-1 rounded font-medium truncate",
                        post.status === "SCHEDULED" ? "bg-blue-500/10 text-blue-400" :
                        post.status === "PUBLISHED" ? "bg-emerald-500/10 text-emerald-400" :
                        "bg-zinc-500/10 text-zinc-400"
                      )}
                      title={post.title}
                    >
                      {post.title}
                    </div>
                  ))}
                  {dayPosts.length === 0 && (
                    <div className="text-[10px] text-zinc-700 px-1.5 py-1 italic">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Posts List */}
      <div className="rounded-xl bg-[#111111] border border-white/[0.04] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold">All Posts</h2>
          </div>
          <span className="text-xs text-zinc-600">{posts.length} posts</span>
        </div>

        {posts.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            No posts yet. Generate your first LinkedIn post above.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {posts.map((post) => (
              <div key={post.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium truncate">{post.title}</h3>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0", statusColors[post.status] || statusColors.DRAFT)}
                      >
                        {post.status}
                      </Badge>
                      {post.scheduledDate && (
                        <span className="text-[10px] text-zinc-600">
                          {new Date(post.scheduledDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                      {post.body.slice(0, 150)}
                      {post.body.length > 150 ? "..." : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Copy to clipboard"
                      onClick={() => copyToClipboard(post.body, post.id)}
                    >
                      {copied === post.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Clipboard className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    {post.status !== "PUBLISHED" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Mark as published"
                        onClick={() => updateStatus(post.id, "PUBLISHED", null)}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {post.status === "PUBLISHED" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px]"
                        title="Publish to blog"
                        onClick={() => publishToBlog(post.id)}
                        disabled={publishingBlog === post.id}
                      >
                        {publishingBlog === post.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Globe className="h-3.5 w-3.5 mr-1" />
                        )}
                        Blog
                      </Button>
                    )}

                    {post.status !== "ARCHIVED" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Archive"
                        onClick={() => updateStatus(post.id, "ARCHIVED", null)}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 hover:text-red-400"
                      title="Delete"
                      onClick={() => {
                        if (confirm("Delete this post?")) deletePost(post.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
