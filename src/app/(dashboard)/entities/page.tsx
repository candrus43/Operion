import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Building2, Plus, AlertTriangle } from "lucide-react"
import EntitySearch from "@/components/entities/entity-search"

const TIER_ENTITY_LIMITS: Record<string, number | null> = {
  SOLO: 3,
  TEAM: 25,
  ENTERPRISE: null,
}

export default async function EntitiesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const orgId = (session.user as any).organizationId
  if (!orgId) {
    return <div className="flex items-center justify-center h-full">No organization found.</div>
  }

  const [entities, org] = await Promise.all([
    prisma.entity.findMany({
      where: { organizationId: orgId },
      include: {
        _count: { select: { projects: true, tasks: true, contacts: true, documents: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { subscriptionTier: true },
    }),
  ])

  const tier = org?.subscriptionTier || "SOLO"
  const maxEntities = TIER_ENTITY_LIMITS[tier]
  const atLimit = maxEntities !== null && maxEntities !== undefined && entities.length >= maxEntities

  return (
    <div className="space-y-8">
      {/* Warning banner when at entity limit */}
      {atLimit && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-4">
          <div className="flex items-start gap-3 sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <p className="text-sm text-amber-300/90 leading-relaxed">
                {tier === "SOLO"
                  ? "You've reached the 3-entity limit on your Solo plan. Upgrade to Team for unlimited entities."
                  : `You've reached the ${maxEntities}-entity limit on your ${tier.charAt(0) + tier.slice(1).toLowerCase()} plan. Upgrade to Enterprise for unlimited entities.`}
              </p>
            </div>
            <Link href="/pricing" className="shrink-0">
              <Button variant="outline" size="sm" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300">
                Upgrade
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entities</h1>
          <p className="text-muted-foreground mt-1">
            {entities.length} {entities.length === 1 ? "entity" : "entities"} across your portfolio
            {atLimit && (
              <span className="ml-2 text-xs text-amber-400">· Limit reached</span>
            )}
          </p>
        </div>
        {atLimit ? (
          <Button disabled className="gap-2 opacity-50 cursor-not-allowed" title="Entity limit reached">
            <Plus className="h-4 w-4" />
            Add Entity
          </Button>
        ) : (
          <Link href="/entities/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Entity
            </Button>
          </Link>
        )}
      </div>

      <EntitySearch entities={entities} />

      {entities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a1a1a] mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No entities yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Create your first entity to start managing your portfolio — businesses, properties, hotels, and more.
          </p>
          {atLimit ? (
            <div className="mt-4 space-y-3">
              <Button disabled className="gap-2 opacity-50 cursor-not-allowed" title="Entity limit reached">
                <Plus className="h-4 w-4" />
                Add Your First Entity
              </Button>
              <p className="text-xs text-amber-400">
                You've reached your plan's entity limit.
                <Link href="/pricing" className="ml-1 underline underline-offset-2 hover:text-amber-300">Upgrade to add more</Link>
              </p>
            </div>
          ) : (
            <Link href="/entities/new" className="mt-4">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Entity
              </Button>
            </Link>
          )}
        </div>
      ) : null}
    </div>
  )
}
