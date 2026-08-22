import { PageHeader } from "@/components/layout/page-header"
import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Users,
  Plus,
  Phone,
  Mail,
  Building2,
  ChevronRight,
  Search,
  GitMerge,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { findPotentialDuplicateGroups } from "@/lib/contact-similarity"

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ entityId?: string; search?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const orgId = (session.user as any).organizationId
  const sp = await searchParams
  const entityFilter = sp.entityId || "all"
  const searchFilter = sp.search || ""

  const where: any = { organizationId: orgId, mergedIntoId: null }
  if (entityFilter !== "all") {
    where.entityId = entityFilter
  }
  if (searchFilter) {
    where.OR = [
      { name: { contains: searchFilter } },
      { company: { contains: searchFilter } },
      { email: { contains: searchFilter } },
    ]
  }

  const [contacts, entities, allForGroups] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        entity: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.entity.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      where: { organizationId: orgId, mergedIntoId: null },
      select: {
        id: true,
        name: true,
        company: true,
        position: true,
        phone: true,
        email: true,
        notes: true,
        createdAt: true,
      },
    }),
  ])
  const duplicateGroupCount = findPotentialDuplicateGroups(allForGroups as any).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Network"
        title="Contacts"
        description={`${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`}
        actions={
          <div className="flex items-center gap-2">
            {duplicateGroupCount > 0 && (
              <Link href="/contacts/duplicates">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <GitMerge className="h-3.5 w-3.5 text-amber-400" />
                  Review duplicates ({duplicateGroupCount})
                </Button>
              </Link>
            )}
            <Link href="/contacts/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Contact
              </Button>
            </Link>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/contacts${searchFilter ? `?search=${searchFilter}` : ""}`}>
          <Button variant="ghost" size="sm" className={entityFilter === "all" ? "bg-white/[0.04]" : ""}>
            All
          </Button>
        </Link>
        {entities.map((e) => (
          <Link
            key={e.id}
            href={`/contacts?entityId=${e.id}${searchFilter ? `&search=${encodeURIComponent(searchFilter)}` : ""}`}
          >
            <Button variant="ghost" size="sm" className={entityFilter === e.id ? "bg-white/[0.04]" : ""}>
              {e.name}
            </Button>
          </Link>
        ))}
      </div>

      {/* Contacts grid */}
      {contacts.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-500/10 mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground/80">No contacts yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Add contacts to keep track of everyone you work with.
            </p>
            <Link href="/contacts/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Contact
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="block group"
            >
              <Card className="glass hover:bg-white/[0.07] transition-colors h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10">
                        <span className="text-sm font-semibold text-sky-400">
                          {contact.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-white transition-colors">
                          {contact.name}
                        </p>
                        {contact.position && contact.company && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {contact.position} · {contact.company}
                          </p>
                        )}
                        {contact.position && !contact.company && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{contact.position}</p>
                        )}
                        {!contact.position && contact.company && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{contact.company}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-foreground/40 transition-colors shrink-0 mt-3" />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    {contact.email && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </div>
                    )}
                  </div>

                  {contact.entity && (
                    <div className="flex items-center gap-1 mt-2.5 pt-2.5 border-t border-white/[0.03]">
                      <Building2 className="h-3 w-3 text-muted-foreground/40" />
                      <span className="text-[11px] text-muted-foreground/50">{contact.entity.name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
