import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Building2,
  Plus,
  Search,
  Hotel,
  Fuel,
  Store,
  Landmark,
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"

const entityTypeConfig: Record<string, { icon: typeof Building2; color: string; label: string }> = {
  BUSINESS: { icon: Store, color: "bg-violet-500/10 text-violet-400 border-violet-500/20", label: "Business" },
  HOTEL: { icon: Hotel, color: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Hotel" },
  GAS_STATION: { icon: Fuel, color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Gas Station" },
  COMMERCIAL_PROPERTY: { icon: Building2, color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Commercial" },
  INVESTMENT: { icon: Landmark, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Investment" },
  OTHER: { icon: Building2, color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", label: "Other" },
}

export default async function EntitiesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const orgId = (session.user as any).organizationId
  if (!orgId) {
    return <div className="flex items-center justify-center h-full">No organization found.</div>
  }

  const entities = await prisma.entity.findMany({
    where: { organizationId: orgId },
    include: {
      _count: { select: { projects: true, tasks: true, contacts: true, documents: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entities</h1>
          <p className="text-muted-foreground mt-1">
            {entities.length} {entities.length === 1 ? "entity" : "entities"} across your portfolio
          </p>
        </div>
        <Link href="/entities/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Entity
          </Button>
        </Link>
      </div>

      {/* Search placeholder */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search entities..."
          className="pl-9 bg-[#111111] border-0"
        />
      </div>

      {/* Entity Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entities.map((entity) => {
          const config = entityTypeConfig[entity.type] || entityTypeConfig.OTHER
          const Icon = config.icon

          return (
            <Link key={entity.id} href={`/entities/${entity.id}`}>
              <Card className="border-0 bg-[#111111] hover:bg-[#141414] transition-all hover:scale-[1.01] cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", config.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base group-hover:text-white transition-colors">
                          {entity.name}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0 mt-1 border", config.color)}
                        >
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center rounded-lg bg-[#1a1a1a] py-2">
                      <div className="text-lg font-semibold">{entity._count.projects}</div>
                      <div className="text-[10px] text-muted-foreground">Projects</div>
                    </div>
                    <div className="text-center rounded-lg bg-[#1a1a1a] py-2">
                      <div className="text-lg font-semibold">{entity._count.tasks}</div>
                      <div className="text-[10px] text-muted-foreground">Tasks</div>
                    </div>
                    <div className="text-center rounded-lg bg-[#1a1a1a] py-2">
                      <div className="text-lg font-semibold">{entity._count.documents}</div>
                      <div className="text-[10px] text-muted-foreground">Docs</div>
                    </div>
                    <div className="text-center rounded-lg bg-[#1a1a1a] py-2">
                      <div className="text-lg font-semibold">{entity._count.contacts}</div>
                      <div className="text-[10px] text-muted-foreground">Contacts</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {entities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a1a1a] mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No entities yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Create your first entity to start managing your portfolio — businesses, properties, hotels, and more.
          </p>
          <Link href="/entities/new" className="mt-4">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Entity
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
