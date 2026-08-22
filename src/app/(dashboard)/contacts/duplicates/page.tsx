import { PageHeader } from "@/components/layout/page-header"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, GitMerge, ShieldAlert, Undo2 } from "lucide-react"
import { findPotentialDuplicateGroups, pickKeeper } from "@/lib/contact-similarity"
import { MergeGroupButton, UnmergeButton } from "@/components/contacts/merge-actions"

export default async function DuplicatesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId

  // Active (not-already-absorbed) contacts in this org.
  const contacts = await prisma.contact.findMany({
    where: { organizationId: orgId, mergedIntoId: null },
    include: {
      entity: { select: { id: true, name: true } },
      relations: { include: { entity: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  })

  const groups = findPotentialDuplicateGroups(contacts as any)

  // Merge history (reversibility) for this org.
  const mergeHistory = await prisma.contactMerge.findMany({
    where: { organizationId: orgId },
    include: {
      keeper: { select: { id: true, name: true } },
      mergedContact: { select: { id: true, name: true } },
    },
    orderBy: { mergedAt: "desc" },
    take: 50,
  })
  const activeMerges = mergeHistory.filter((m) => m.status === "MERGED")

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/contacts" className="hover:text-foreground transition-colors">
          Contacts
        </Link>
        <span>/</span>
        <span className="text-foreground">Review Duplicates</span>
      </div>

      <PageHeader
        eyebrow="Network"
        title="Review Duplicates"
        description="Potential matches to review before merging — nothing is merged automatically."
        actions={
          <Link href="/contacts">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Contacts
            </Button>
          </Link>
        }
      />

      {/* Honest disclaimer */}
      <Card className="glass border-amber-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="text-foreground/90 font-medium">Potential matches, not a final answer.</p>
            <p className="mt-1">
              The groups below are computed from real shared fields (email, phone, company, name). They are{" "}
              <span className="text-foreground/80 font-medium">suggestions for you to decide on</span> — never an
              automatic merge. Review each group, then confirm a merge. Every merge can be undone from the history
              below.
            </p>
          </div>
        </CardContent>
      </Card>

      {groups.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 mb-4">
              <GitMerge className="h-7 w-7 text-emerald-400" />
            </div>
            <p className="text-lg font-medium text-foreground/80">No potential duplicates found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              We didn&apos;t find any contacts sharing a confident name and a corroborating signal (email, phone, or
              company). New potential matches will appear here as contacts are added.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {groups.length} potential duplicate group{groups.length === 1 ? "" : "s"}
          </p>
          {groups.map((group, gi) => {
            const keeper = pickKeeper(group as any)
            const others = group.filter((c) => c.id !== keeper.id)
            return (
              <Card key={gi} className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitMerge className="h-4 w-4 text-sky-400" />
                    Potential match
                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 border bg-amber-500/10 text-amber-400 border-amber-500/20">
                      {group.length} contacts
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.map((c) => {
                    const isKeeper = c.id === keeper.id
                    return (
                      <div
                        key={c.id}
                        className={`flex items-start gap-3 rounded-xl border p-3 ${
                          isKeeper ? "border-sky-500/30 bg-sky-500/[0.06]" : "border-white/[0.04]"
                        }`}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
                          <span className="text-xs font-semibold text-sky-400">
                            {(c as any).name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/contacts/${c.id}`}
                              className="text-sm font-medium hover:underline truncate"
                            >
                              {(c as any).name}
                            </Link>
                            {isKeeper && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                Keeper
                              </Badge>
                            )}
                          </div>
                          {(c as any).position && (c as any).company && (
                            <p className="text-xs text-muted-foreground truncate">
                              {(c as any).position} · {(c as any).company}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground/70">
                            {(c as any).email && <span>{(c as any).email}</span>}
                            {(c as any).phone && <span>{(c as any).phone}</span>}
                            {(c as any).company && !(c as any).position && <span>{(c as any).company}</span>}
                            {(c as any).relations?.length > 0 && (
                              <span>
                                {(c as any).relations.length} entit{(c as any).relations.length === 1 ? "y" : "ies"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {others.length > 0 && (
                    <div className="pt-2 flex justify-end">
                      <MergeGroupButton
                        keeperId={keeper.id}
                        keeperName={(keeper as any).name}
                        mergedIds={others.map((c) => c.id)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Merge history */}
      <div className="pt-2">
        <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
          <Undo2 className="h-4 w-4 text-muted-foreground" />
          Merge History
        </h2>
        {activeMerges.length === 0 ? (
          <Card className="glass">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No merges yet. Merges appear here and can always be undone.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activeMerges.map((m) => (
              <Card key={m.id} className="glass">
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <Link href={`/contacts/${m.keeperId}`} className="text-sky-400 hover:underline font-medium">
                        {m.keeper.name}
                      </Link>{" "}
                      absorbed{" "}
                      <Link href={`/contacts/${m.mergedId}`} className="hover:underline font-medium">
                        {m.mergedContact.name}
                      </Link>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Merged {new Date(m.mergedAt).toLocaleString()}
                    </p>
                  </div>
                  <UnmergeButton mergeId={m.id} mergedName={m.mergedContact.name} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
