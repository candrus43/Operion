import { PageHeader } from "@/components/layout/page-header"
import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
  TASK_VIEWS,
  DEFAULT_VIEW,
  isValidViewId,
  buildViewWhere,
  type TaskViewId,
} from "@/lib/task-views"
import type { Prisma } from "@prisma/client"
import { TaskListClient } from "./task-list-client"

export const dynamic = "force-dynamic"

const HOUR = 60 * 60 * 1000

function buildDueWhere(due: string): Prisma.TaskWhereInput {
  const now = new Date()
  switch (due) {
    case "overdue":
      return { dueDate: { lt: now } }
    case "next7":
      return { dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * HOUR) } }
    case "next30":
      return { dueDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * HOUR) } }
    case "none":
      return { dueDate: null }
    default:
      return {}
  }
}

export default async function TasksPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const orgId = (session.user as any).organizationId
  const currentUserId = (session.user as any).id
  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No organization found.</p>
      </div>
    )
  }

  const params = await props.searchParams

  // ── Resolve the effective saved view ────────────────────────────────────
  // Explicit ?view= wins. Otherwise keep legacy deep-links working:
  //   ?status=X (chips/sidebar)         → All Tasks, filtered by that status
  //   ?mine=true (dashboard "my tasks") → My Tasks
  // With nothing → default to Needs My Attention (owner direction).
  let view: TaskViewId
  if (isValidViewId(params.view)) {
    view = params.view
  } else if (params.status && params.status !== "all") {
    view = "all"
  } else if (params.mine === "true") {
    view = "my-tasks"
  } else {
    view = DEFAULT_VIEW
  }

  // ── Parse the combinable filters ────────────────────────────────────────
  const status = params.status && params.status !== "all" ? params.status : undefined
  const priority = params.priority && params.priority !== "all" ? params.priority : undefined
  const assignee = params.assignee && params.assignee !== "all" ? params.assignee : undefined
  const entity = params.entity && params.entity !== "all" ? params.entity : undefined
  const project = params.project && params.project !== "all" ? params.project : undefined
  const due = params.due && params.due !== "all" ? params.due : undefined
  const search = params.search?.trim() || undefined

  const sortField = params.sort || "dueDate"
  const sortDir = params.sortDir === "desc" ? "desc" : "asc"

  // ── Compose the single query: view preset AND'ed with each active filter ──
  const viewWhere = buildViewWhere(view, { organizationId: orgId, userId: currentUserId })

  const filterFragments: Prisma.TaskWhereInput[] = []
  if (status) filterFragments.push({ status })
  if (priority) filterFragments.push({ priority })
  if (assignee) filterFragments.push({ assigneeId: assignee })
  if (entity) filterFragments.push({ entityId: entity })
  if (project) filterFragments.push({ projectId: project })
  if (due) filterFragments.push(buildDueWhere(due))
  if (search) {
    filterFragments.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ],
    })
  }

  const where: Prisma.TaskWhereInput = { AND: [viewWhere, ...filterFragments] }

  // ── Sort (default: due date ascending — which naturally surfaces overdue first) ──
  const dueDateOrder: Prisma.SortOrder = sortDir === "desc" ? "desc" : "asc"
  let orderBy: Prisma.TaskOrderByWithRelationInput[] = [
    { dueDate: { sort: dueDateOrder, nulls: "last" } },
  ]
  if (sortField === "priority") {
    orderBy = [{ priority: "asc" }, { dueDate: { sort: dueDateOrder, nulls: "last" } }]
  } else if (sortField === "title") {
    orderBy = [{ title: sortDir }]
  } else if (sortField === "status") {
    orderBy = [{ status: sortDir }, { dueDate: { sort: dueDateOrder, nulls: "last" } }]
  } else if (sortField === "createdAt") {
    orderBy = [{ createdAt: sortDir }]
  }

  const [tasks, users, entities, projects, counts, taskCount] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignee: true,
        project: true,
        entity: true,
        dependsOn: { select: { id: true, title: true, status: true } },
      },
      orderBy,
    }),
    prisma.user.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } }),
    prisma.entity.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } }),
    // One count per saved view using the same where builder (org-scoped).
    Promise.all(
      TASK_VIEWS.map((v) =>
        prisma.task.count({ where: buildViewWhere(v.id, { organizationId: orgId, userId: currentUserId }) }),
      ),
    ),
    prisma.task.count({ where: { organizationId: orgId } }),
  ])

  const countsMap = Object.fromEntries(
    TASK_VIEWS.map((v, i) => [v.id, counts[i]]),
  ) as Record<TaskViewId, number>

  const viewMeta = TASK_VIEWS.find((v) => v.id === view)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Tasks"
        description={`${taskCount} ${taskCount === 1 ? "task" : "tasks"} across your organization`}
        actions={
          <Link href="/tasks/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </Link>
        }
      />

      <Suspense fallback={<div className="rounded-xl glass h-96 animate-pulse" />}>
        <TaskListClient
          tasks={JSON.parse(JSON.stringify(tasks))}
          users={users}
          entities={entities}
          projects={projects}
          currentUserId={currentUserId}
          view={view}
          viewLabel={viewMeta?.label ?? "Tasks"}
          counts={countsMap}
          activeFilterCount={filterFragments.length}
        />
      </Suspense>
    </div>
  )
}
