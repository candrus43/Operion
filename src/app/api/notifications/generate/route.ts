import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id

  const created: string[] = []
  const now = new Date()

  // 1. Contract expiring: Document with type CONTRACT, INSURANCE, LICENSE, LEASE
  //    where createdAt is > 11 months ago
  const elevenMonthsAgo = new Date(now.getTime() - 11 * 30 * 24 * 60 * 60 * 1000)
  const renewalTypes = ["CONTRACT", "INSURANCE", "LICENSE", "LEASE"]

  const renewalDocs = await prisma.document.findMany({
    where: {
      organizationId: orgId,
      type: { in: renewalTypes },
      createdAt: { lt: elevenMonthsAgo },
    },
  })

  for (const doc of renewalDocs) {
    // Check if notification already exists
    const existing = await prisma.notification.findFirst({
      where: {
        organizationId: orgId,
        userId,
        type: "RENEWAL",
        message: { contains: doc.name },
        createdAt: { gt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    })
    if (!existing) {
      await prisma.notification.create({
        data: {
          organizationId: orgId,
          userId,
          type: "RENEWAL",
          title: "Contract renewal needed",
          message: `Contract renewal: ${doc.name} may need renewal`,
          link: `/documents/${doc.id}`,
        },
      })
      created.push(`RENEWAL: ${doc.name}`)
    }
  }

  // 2. Task overdue: past due date, status not DONE
  const overdueTasks = await prisma.task.findMany({
    where: {
      organizationId: orgId,
      dueDate: { lt: now },
      status: { not: "DONE" },
    },
  })

  for (const task of overdueTasks) {
    const existing = await prisma.notification.findFirst({
      where: {
        organizationId: orgId,
        userId,
        type: "OVERDUE",
        message: { contains: task.title },
        createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    })
    if (!existing) {
      await prisma.notification.create({
        data: {
          organizationId: orgId,
          userId,
          type: "OVERDUE",
          title: "Task overdue",
          message: `Task overdue: ${task.title}`,
          link: `/tasks/${task.id}`,
        },
      })
      created.push(`OVERDUE: ${task.title}`)
    }
  }

  // 3. Project stalled: progress ≤ 20% and startDate > 30 days ago
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const stalledProjects = await prisma.project.findMany({
    where: {
      organizationId: orgId,
      progress: { lte: 20 },
      startDate: { lt: thirtyDaysAgo },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
  })

  for (const project of stalledProjects) {
    const existing = await prisma.notification.findFirst({
      where: {
        organizationId: orgId,
        userId,
        type: "STALLED",
        message: { contains: project.name },
        createdAt: { gt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    })
    if (!existing) {
      await prisma.notification.create({
        data: {
          organizationId: orgId,
          userId,
          type: "STALLED",
          title: "Project stalled",
          message: `Project stalled: ${project.name} has low progress (${project.progress}%)`,
          link: `/projects/${project.id}`,
        },
      })
      created.push(`STALLED: ${project.name}`)
    }
  }

  // 4. Deadline approaching: tasks due within 3 days, status not DONE
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const upcomingTasks = await prisma.task.findMany({
    where: {
      organizationId: orgId,
      dueDate: { gt: now, lte: threeDaysFromNow },
      status: { not: "DONE" },
    },
  })

  for (const task of upcomingTasks) {
    const existing = await prisma.notification.findFirst({
      where: {
        organizationId: orgId,
        userId,
        type: "DEADLINE",
        message: { contains: task.title },
        createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    })
    if (!existing) {
      await prisma.notification.create({
        data: {
          organizationId: orgId,
          userId,
          type: "DEADLINE",
          title: "Deadline approaching",
          message: `Deadline approaching: ${task.title} is due within 3 days`,
          link: `/tasks/${task.id}`,
        },
      })
      created.push(`DEADLINE: ${task.title}`)
    }
  }

  return NextResponse.json({ created: created.length, details: created })
}
