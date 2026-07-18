import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { TaskForm } from "../../task-form"

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const orgId = (session.user as any).organizationId

  const task = await prisma.task.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!task) notFound()

  const [users, entities, projects, allTasks] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    }),
    prisma.entity.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: {
        organizationId: orgId,
        status: { not: "DONE" },
      },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: 100,
    }),
  ])

  return (
    <TaskForm
      users={JSON.parse(JSON.stringify(users))}
      entities={JSON.parse(JSON.stringify(entities))}
      projects={JSON.parse(JSON.stringify(projects))}
      allTasks={JSON.parse(JSON.stringify(allTasks))}
      task={JSON.parse(JSON.stringify(task))}
      isEdit
    />
  )
}
