"use client"

import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  Key,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
}

const promptGroups = [
  {
    label: "Priorities",
    prompts: [
      "What needs my attention today?",
      "What should I focus on first?",
    ],
  },
  {
    label: "Projects",
    prompts: [
      "Which projects are behind schedule?",
      "What am I waiting on?",
    ],
  },
  {
    label: "Overview",
    prompts: ["Summarize this week"],
  },
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
          AI features require an OpenAI API key. Add <code className="bg-white/[0.04] px-1.5 py-0.5 rounded text-sm">OPENAI_API_KEY</code> to
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
          <Sparkles className="h-[18px] w-[18px] text-violet-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">AI Assistant</h1>
          <p className="text-xs text-muted-foreground/70">
            Ask about your portfolio — I have full context of your entities, projects, and tasks.
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-5 pb-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/[0.04] ring-1 ring-violet-500/[0.08] mb-5">
              <Bot className="h-8 w-8 text-violet-400/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground/80 mb-8">
              How can I help you today?
            </h3>

            {/* Suggested prompts — grouped */}
            <div className="w-full max-w-lg space-y-6">
              {promptGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40 mb-2.5">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.prompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl glass border border-white/[0.05] px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.07] hover:border-white/[0.08] hover:shadow-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed group"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-violet-400/50 group-hover:text-violet-400/80 transition-colors" />
                        <span>{prompt}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/30 transition-all -ml-1" />
                      </button>
                    ))}
                  </div>
                </div>
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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <Sparkles className="h-4 w-4 text-violet-400" />
            </div>
            <div className="rounded-[20px] rounded-tl-md bg-[#0f0f0f] border border-white/[0.06] px-5 py-3.5">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400/30 animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400/30 animate-bounce" style={{ animationDelay: "240ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 pt-3 pb-4">
        <div className="relative">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your portfolio..."
            disabled={loading}
            className="pr-12 py-6 text-[15px] bg-[#0f0f0f] border-white/[0.06] rounded-2xl focus-visible:ring-violet-500/20 focus-visible:border-white/[0.1] placeholder:text-muted-foreground/40 transition-colors"
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl transition-all duration-200",
              input.trim()
                ? "bg-violet-500 hover:bg-violet-400 text-white shadow-sm shadow-violet-500/20"
                : "bg-white/[0.04] text-muted-foreground/40"
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground/40 text-center mt-2.5">
          Operion AI uses your portfolio data to provide context-aware answers.
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
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-0.5",
          isUser
            ? "bg-blue-500/10 ring-1 ring-blue-500/20"
            : "bg-violet-500/10 ring-1 ring-violet-500/20"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-blue-400" />
        ) : (
          <Sparkles className="h-4 w-4 text-violet-400" />
        )}
      </div>

      {/* Bubble */}
      <div className={cn("max-w-[80%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-[20px] px-5 py-3.5 text-[15px] leading-relaxed",
            isUser
              ? "rounded-tr-md bg-blue-500/[0.08] border border-blue-500/[0.12] text-foreground/95"
              : "rounded-tl-md bg-[#0f0f0f] border border-white/[0.05] text-foreground/90 relative overflow-hidden"
          )}
        >
          {/* Subtle left accent for AI bubbles */}
          {!isUser && (
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-violet-500/40 via-violet-500/20 to-transparent" />
          )}

          <div className={cn(isUser ? "" : "pl-1")}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <MarkdownContent content={message.content} />
            )}
          </div>
        </div>

        {/* Streaming cursor */}
        {isStreaming && (
          <StreamingIndicator />
        )}
      </div>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children, ...props }) => (
            <h1 className="text-lg font-semibold text-foreground mt-6 mb-3 first:mt-0" {...props}>{children}</h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-base font-semibold text-foreground/95 mt-5 mb-2.5 first:mt-0" {...props}>{children}</h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-[15px] font-semibold text-foreground/90 mt-4 mb-2 first:mt-0" {...props}>{children}</h3>
          ),
          // Paragraphs
          p: ({ children, ...props }) => (
            <p className="text-[15px] leading-relaxed text-foreground/85 mb-3 last:mb-0" {...props}>{children}</p>
          ),
          // Bold
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-foreground" {...props}>{children}</strong>
          ),
          // Lists
          ul: ({ children, ...props }) => (
            <ul className="space-y-1.5 my-3 list-none pl-0 first:mt-0 last:mb-0" {...props}>{children}</ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="space-y-1.5 my-3 pl-0 list-none first:mt-0 last:mb-0" {...props}>{children}</ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-[15px] leading-relaxed text-foreground/85 flex items-start gap-2.5 before:content-['•'] before:text-violet-400/50 before:shrink-0 before:mt-[3px]" {...props}>{children}</li>
          ),
          // Inline code
          code: ({ className, children, ...props }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code className="bg-white/[0.06] text-foreground/80 px-1.5 py-0.5 rounded-md text-[13px] font-mono" {...props}>
                  {children}
                </code>
              )
            }
            return (
              <code className={cn("block bg-[#08080a] border border-white/[0.06] rounded-xl px-4 py-3 my-3 text-[13px] font-mono leading-relaxed text-foreground/80 overflow-x-auto", className)} {...props}>
                {children}
              </code>
            )
          },
          pre: ({ children, ...props }) => (
            <pre className="!bg-transparent !p-0 !m-0" {...props}>{children}</pre>
          ),
          // Links
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 underline decoration-violet-400/30 hover:decoration-violet-400/60 underline-offset-2 transition-colors"
              {...props}
            >
              {children}
            </a>
          ),
          // Blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-2 border-violet-500/20 pl-4 my-3 text-foreground/70 italic" {...props}>{children}</blockquote>
          ),
          // Horizontal rule
          hr: (props) => (
            <hr className="border-white/[0.06] my-4" {...props} />
          ),
          // Tables (GFM)
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-3">
              <table className="w-full text-[14px] border-collapse" {...props}>{children}</table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="border-b border-white/[0.08]" {...props}>{children}</thead>
          ),
          th: ({ children, ...props }) => (
            <th className="text-left font-medium text-muted-foreground px-3 py-2 first:pl-0 last:pr-0" {...props}>{children}</th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-3 py-2 first:pl-0 last:pr-0 border-b border-white/[0.03]" {...props}>{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2 mt-2 ml-1">
      <div className="flex items-center gap-0.5">
        <span className="h-1 w-1 rounded-full bg-violet-400/60 animate-stream-1" />
        <span className="h-1 w-1 rounded-full bg-violet-400/60 animate-stream-2" />
        <span className="h-1 w-1 rounded-full bg-violet-400/60 animate-stream-3" />
      </div>
      <span className="text-[11px] text-violet-400/50 font-medium tracking-wide animate-pulse">
        typing
      </span>
    </div>
  )
}
