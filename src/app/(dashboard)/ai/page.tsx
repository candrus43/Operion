"use client"

import { ChatPanel } from "@/components/ai/chat-panel"

export default function AIChatPage() {
  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-7rem)]">
      <ChatPanel isOpen={true} variant="full" />
    </div>
  )
}
