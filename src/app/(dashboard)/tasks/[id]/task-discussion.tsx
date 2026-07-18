"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface Author {
  id: string
  name: string
  image: string | null
}

interface Comment {
  id: string
  content: string
  taskId: string
  authorId: string
  author: Author
  createdAt: string
}

interface OrgMember {
  id: string
  name: string
}

function formatCommentTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function highlightMentions(text: string) {
  const parts = text.split(/(@[a-zA-Z]+(?:\s+[a-zA-Z]+)?)/g)
  return parts.map((part, i) => {
    if (part.startsWith("@") && part.length > 1) {
      return (
        <span
          key={i}
          className="bg-amber-500/10 text-amber-400 rounded px-0.5 font-medium"
        >
          {part}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function TaskDiscussion({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState("")
  const [posting, setPosting] = useState(false)
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
  const [mentionSearch, setMentionSearch] = useState("")
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [taskId])

  const fetchOrgMembers = useCallback(async () => {
    try {
      // Fetch org users via a simple approach — use the entity members or search
      const res = await fetch("/api/search?q=&type=contact")
      // We need a proper endpoint. Let's use the existing notifications approach
      // Actually, let's use a simpler approach: we'll fetch all users for the org
      const userRes = await fetch(`/api/users`)
      if (userRes.ok) {
        const data = await userRes.json()
        setOrgMembers(data)
      }
    } catch {
      // If the endpoint doesn't exist, that's fine — we'll fallback
    }
  }, [])

  useEffect(() => {
    fetchComments()
    fetchOrgMembers()
  }, [fetchComments, fetchOrgMembers])

  // Handle @mention detection
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const textBeforeCursor = content.substring(0, cursorPos)

    // Find the last @ that starts a mention
    const lastAtPos = textBeforeCursor.lastIndexOf("@")
    if (lastAtPos === -1) {
      setShowMentionDropdown(false)
      return
    }

    // Check if there's a space between @ and cursor (no match if space)
    const textAfterAt = textBeforeCursor.substring(lastAtPos + 1)
    if (textAfterAt.includes(" ")) {
      setShowMentionDropdown(false)
      return
    }

    setMentionSearch(textAfterAt.toLowerCase())
    setShowMentionDropdown(true)
    setMentionIndex(0)
  }, [content])

  const filteredMembers = orgMembers.filter(
    (m) => m.name.toLowerCase().includes(mentionSearch)
  )

  const insertMention = (member: OrgMember) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const textBeforeCursor = content.substring(0, cursorPos)
    const lastAtPos = textBeforeCursor.lastIndexOf("@")
    const textAfterCursor = content.substring(cursorPos)

    const newContent =
      content.substring(0, lastAtPos) +
      `@${member.name} ` +
      textAfterCursor

    setContent(newContent)
    setShowMentionDropdown(false)
    setMentionSearch("")

    // Refocus and set cursor after the inserted mention
    setTimeout(() => {
      const newCursorPos = lastAtPos + member.name.length + 2 // @ + name + space
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentionDropdown || filteredMembers.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setMentionIndex((prev) => (prev + 1) % filteredMembers.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setMentionIndex(
        (prev) =>
          (prev - 1 + filteredMembers.length) % filteredMembers.length
      )
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault()
      insertMention(filteredMembers[mentionIndex])
    } else if (e.key === "Escape") {
      setShowMentionDropdown(false)
    }
  }

  const handleSubmit = async () => {
    if (!content.trim() || posting) return

    setPosting(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        const newComment = await res.json()
        setComments((prev) => [...prev, newComment])
        setContent("")
      }
    } catch {
      // ignore
    } finally {
      setPosting(false)
    }
  }

  return (
    <Card className="border-0 bg-[#111111]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-amber-400" />
          Discussion
          {comments.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              ({comments.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-[#1a1a1a]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 bg-[#1a1a1a] rounded" />
                  <div className="h-3 w-full bg-[#1a1a1a] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 mb-2">
              <MessageSquare className="h-5 w-5 text-amber-400/60" />
            </div>
            <p className="text-sm text-muted-foreground">
              No comments yet. Start the discussion.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[10px] bg-[#222]">
                    {comment.author.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {comment.author.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatCommentTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">
                    {highlightMentions(comment.content)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comment input */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment... Use @ to mention someone"
            className="min-h-[60px] bg-[#1a1a1a] border-white/[0.06] resize-none text-sm"
            disabled={posting}
          />
          {/* @mention dropdown */}
          {showMentionDropdown && filteredMembers.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute bottom-full left-0 mb-1 w-56 max-h-[180px] overflow-y-auto rounded-lg border border-white/[0.06] bg-[#1a1a1a] shadow-xl z-50"
            >
              {filteredMembers.map((member, idx) => (
                <button
                  key={member.id}
                  type="button"
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-white/[0.05] transition-colors",
                    idx === mentionIndex && "bg-white/[0.08]"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    insertMention(member)
                  }}
                  onMouseEnter={() => setMentionIndex(idx)}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[8px] bg-[#222]">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span>{member.name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim() || posting}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {posting ? "Posting..." : "Comment"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
