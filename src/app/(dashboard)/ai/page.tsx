"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  Key,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
}

const suggestedPrompts = [
  "What needs my attention today?",
  "Which projects are behind schedule?",
  "What am I waiting on?",
  "Summarize this week",
  "What should I focus on first?",
]

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return

    const userMessage: Message = { role: "user", content: content.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setLoading(true)
    setStreamingContent("")

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      // Handle non-OK responses
      if (!response.ok) {
        const data = await response.json()
        if (response.status === 503 && data.error === "API key not configured") {
          setApiKeyMissing(true)
        } else {
          setMessages([
            ...newMessages,
            {
              role: "assistant",
              content: data.message || "Sorry, something went wrong. Please try again.",
            },
          ])
        }
        setLoading(false)
        return
      }

      // Handle streaming
      const contentType = response.headers.get("Content-Type") || ""
      if (contentType.includes("text/event-stream")) {
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let accumulated = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith("data: ")) continue
            if (trimmed === "data: [DONE]") continue

            try {
              const json = JSON.parse(trimmed.slice(6))
              const delta = json.choices?.[0]?.delta?.content
              if (delta) {
                accumulated += delta
                setStreamingContent(accumulated)
              }
            } catch {
              // Skip unparseable chunks
            }
          }
        }

        setMessages([...newMessages, { role: "assistant", content: accumulated }])
        setStreamingContent("")
      } else {
        // Non-streaming fallback
        const data = await response.json()
        if (data.error) {
          setMessages([
            ...newMessages,
            { role: "assistant", content: data.message || "Sorry, something went wrong." },
          ])
        }
      }
    } catch (err) {
      console.error("Chat error:", err)
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please check your connection and try again.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // API key missing state
  if (apiKeyMissing) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20 mb-6">
          <Key className="h-8 w-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">AI Features Not Configured</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          AI features require an OpenAI API key. Add <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-sm">OPENAI_API_KEY</code> to
          your environment variables to continue.
        </p>
        <Button variant="outline" onClick={() => setApiKeyMissing(false)}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
          <Sparkles className="h-4.5 w-4.5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">AI Assistant</h1>
          <p className="text-xs text-muted-foreground/80">
            Ask about your portfolio — I have full context of your entities, projects, and tasks.
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/5 ring-1 ring-violet-500/10 mb-4">
              <Bot className="h-8 w-8 text-violet-400/60" />
            </div>
            <h3 className="text-base font-medium text-muted-foreground mb-6">
              How can I help you today?
            </h3>

            {/* Suggested prompts */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1a1a] border border-white/[0.06] px-4 py-2 text-sm text-muted-foreground hover:text-white hover:bg-[#222] hover:border-white/[0.1] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="h-3 w-3 text-violet-400/60" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Streaming message */}
        {streamingContent && (
          <MessageBubble
            message={{ role: "assistant", content: streamingContent }}
            isStreaming
          />
        )}

        {/* Loading indicator */}
        {loading && !streamingContent && (
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-[#111111] border border-white/[0.04] px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 pt-2 pb-4">
        <div className="relative">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your portfolio..."
            disabled={loading}
            className="pr-12 py-6 text-base bg-[#111111] border-white/[0.06] rounded-2xl focus-visible:ring-violet-500/20 placeholder:text-muted-foreground/50"
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl transition-all",
              input.trim()
                ? "bg-violet-500 hover:bg-violet-600 text-white"
                : "bg-[#1a1a1a] text-muted-foreground"
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground/50 text-center mt-2">
          Operion AI uses your portfolio data to provide context-aware answers. Data stays within your organization.
        </p>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  isStreaming = false,
}: {
  message: Message
  isStreaming?: boolean
}) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          isUser
            ? "bg-blue-500/10 ring-1 ring-blue-500/20"
            : "bg-violet-500/10 ring-1 ring-violet-500/20"
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-blue-400" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-blue-500/10 border border-blue-500/10 text-foreground"
            : "rounded-tl-sm bg-[#111111] border border-white/[0.04] text-foreground/90"
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-violet-400/60 ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  )
}
