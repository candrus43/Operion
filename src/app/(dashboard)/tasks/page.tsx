import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TaskListClient } from "./task-list-client"

export default async function TasksPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const orgId = (session.user as any).organizationId
  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No organization found.</p>
      </div>
    )
  }

  const searchParams = await props.searchParams
  const statusFilter = searchParams.status || ""
  const priorityFilter = searchParams.priority || ""
  const searchQuery = searchParams.search || ""
  const sortBy = searchParams.sort || "dueDate"

  // Build where clause
  const where: any = { organizationId: orgId }
  if (statusFilter && statusFilter !== "all") where.status = statusFilter
  if (priorityFilter && priorityFilter !== "all") where.priority = priorityFilter
  if (searchQuery) {
    where.OR = [
      { title: { contains: searchQuery } },
      { description: { contains: searchQuery } },
    ]
  }

  // Sort
  let orderBy: any = [{ dueDate: { sort: "asc", nulls: "last" } }]
  if (sortBy === "priority") {
    orderBy = [{ priority: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }]
  } else if (sortBy === "title") {
    orderBy = [{ title: "asc" }]
  } else if (sortBy === "status") {
    orderBy = [{ status: "asc" }]
  } else if (sortBy === "createdAt") {
    orderBy = [{ createdAt: "desc" }]
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: true,
      project: true,
      entity: true,
      dependsOn: { select: { id: true, title: true, status: true } },
    },
    orderBy,
  })

  // Fetch users + entities + projects for filters
  const [users, entities, projects] = await Promise.all([
    prisma.user.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } }),
    prisma.entity.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } }),
  ])

  const taskCount = await prisma.task.count({ where: { organizationId: orgId } })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            {taskCount} {taskCount === 1 ? "task" : "tasks"} across your organization
          </p>
        </div>
        <Link href="/tasks/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div className="rounded-xl bg-[#111111] h-96 animate-pulse" />}>
        <TaskListClient
          tasks={JSON.parse(JSON.stringify(tasks))}
          users={users}
          entities={entities}
          projects={projects}
        />
      </Suspense>
    </div>
  )
}
