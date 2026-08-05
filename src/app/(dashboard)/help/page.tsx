import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HelpCircle, BookOpen, MessageCircle, Mail } from "lucide-react"

export default async function HelpPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help & Documentation</h1>
        <p className="text-muted-foreground mt-1">
          Guides, FAQs, and support resources for Operion.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl glass border border-white/[0.06] p-6 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <BookOpen className="h-5 w-5 text-blue-400" />
          </div>
          <h3 className="font-semibold">Getting Started Guide</h3>
          <p className="text-sm text-muted-foreground">
            Learn the basics — setting up entities, creating tasks, and using the AI briefing.
          </p>
        </div>

        <div className="rounded-xl glass border border-white/[0.06] p-6 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
            <MessageCircle className="h-5 w-5 text-violet-400" />
          </div>
          <h3 className="font-semibold">FAQs</h3>
          <p className="text-sm text-muted-foreground">
            Common questions about teams, billing, integrations, and entity management.
          </p>
        </div>
      </div>

      <div className="rounded-xl glass border border-white/[0.06] p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <Mail className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold">Need more help?</h3>
            <p className="text-sm text-muted-foreground">
              Reach out to our support team at support@operion.app
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
