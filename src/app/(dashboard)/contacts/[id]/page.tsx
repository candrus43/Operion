import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Pencil,
  Phone,
  Mail,
  Building2,
  Briefcase,
  FolderKanban,
  StickyNote,
} from "lucide-react"
import { ContactDeleteButton } from "./delete-button"

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const orgId = (session.user as any).organizationId

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: orgId },
    include: {
      entity: {
        select: {
          id: true,
          name: true,
          projects: {
            select: { id: true, name: true, status: true },
            take: 10,
            orderBy: { updatedAt: "desc" },
          },
        },
      },
    },
  })

  if (!contact) notFound()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/contacts">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{contact.name}</h1>
            {contact.company && (
              <Badge variant="outline" className="text-[11px] px-2 py-0.5 border bg-blue-500/10 text-blue-400 border-blue-500/20">
                {contact.company}
              </Badge>
            )}
            {contact.position && (
              <Badge variant="outline" className="text-[11px] px-2 py-0.5 border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                {contact.position}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/contacts/${contact.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <ContactDeleteButton contactId={contact.id} contactName={contact.name} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <Card className="border-0 bg-[#111111]">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {contact.email && (
                  <div className="flex items-center gap-3 rounded-lg bg-[#1a1a1a] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 shrink-0">
                      <Mail className="h-4 w-4 text-sky-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Email</p>
                      <a href={`mailto:${contact.email}`} className="text-sm hover:text-white transition-colors truncate block">
                        {contact.email}
                      </a>
                    </div>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-3 rounded-lg bg-[#1a1a1a] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
                      <Phone className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Phone</p>
                      <a href={`tel:${contact.phone}`} className="text-sm hover:text-white transition-colors truncate block">
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                )}
                {contact.company && (
                  <div className="flex items-center gap-3 rounded-lg bg-[#1a1a1a] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 shrink-0">
                      <Building2 className="h-4 w-4 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Company</p>
                      <p className="text-sm truncate">{contact.company}</p>
                    </div>
                  </div>
                )}
                {contact.position && (
                  <div className="flex items-center gap-3 rounded-lg bg-[#1a1a1a] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
                      <Briefcase className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Position</p>
                      <p className="text-sm truncate">{contact.position}</p>
                    </div>
                  </div>
                )}
              </div>
              {!contact.email && !contact.phone && !contact.company && !contact.position && (
                <p className="text-sm text-muted-foreground/50 italic text-center py-4">No contact information provided.</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {contact.notes && (
            <Card className="border-0 bg-[#111111]">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-amber-400" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Linked Projects (via entity) */}
          {contact.entity && contact.entity.projects.length > 0 && (
            <Card className="border-0 bg-[#111111]">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-violet-400" />
                  Related Projects
                </CardTitle>
                <p className="text-xs text-muted-foreground">Projects linked via {contact.entity.name}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {contact.entity.projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-3 rounded-lg bg-[#1a1a1a] hover:bg-[#1e1e1e] p-3 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate group-hover:text-white transition-colors">{project.name}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {project.status.replace("_", " ")}
                    </Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Linked Entity */}
          <Card className="border-0 bg-[#111111]">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Linked Entity</CardTitle>
            </CardHeader>
            <CardContent>
              {contact.entity ? (
                <Link
                  href={`/entities/${contact.entity.id}`}
                  className="flex items-center gap-2 rounded-lg bg-[#1a1a1a] hover:bg-[#1e1e1e] p-3 transition-colors group"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
                  <span className="text-sm group-hover:text-white transition-colors">{contact.entity.name}</span>
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground/50">Not linked to an entity</p>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card className="border-0 bg-[#111111]">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Created</span>
                <span className="text-xs text-muted-foreground">
                  {contact.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Updated</span>
                <span className="text-xs text-muted-foreground">
                  {contact.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
