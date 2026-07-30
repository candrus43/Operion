import { prisma } from "@/lib/db"

/**
 * Generate system notifications for all users in an organization.
 * Checks for: overdue tasks, stalled projects, upcoming deadlines, expiring contracts.
 * Returns the total number of notifications created.
 */
export async function generateNotifications(orgId: string): Promise<number> {
  const now = new Date()
  let totalCreated = 0

  // Get all users in the org
  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  })

  if (users.length === 0) return 0

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
    for (const user of users) {
      const existing = await prisma.notification.findFirst({
        where: {
          organizationId: orgId,
          userId: user.id,
          type: "RENEWAL",
          message: { contains: doc.name },
          createdAt: { gt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            organizationId: orgId,
            userId: user.id,
            type: "RENEWAL",
            title: "Contract renewal needed",
            message: `Contract renewal: ${doc.name} may need renewal`,
            link: `/documents/${doc.id}`,
          },
        })
        totalCreated++
      }
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
    for (const user of users) {
      const existing = await prisma.notification.findFirst({
        where: {
          organizationId: orgId,
          userId: user.id,
          type: "OVERDUE",
          message: { contains: task.title },
          createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            organizationId: orgId,
            userId: user.id,
            type: "OVERDUE",
            title: "Task overdue",
            message: `Task overdue: ${task.title}`,
            link: `/tasks/${task.id}`,
          },
        })
        totalCreated++
      }
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
    for (const user of users) {
      const existing = await prisma.notification.findFirst({
        where: {
          organizationId: orgId,
          userId: user.id,
          type: "STALLED",
          message: { contains: project.name },
          createdAt: { gt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            organizationId: orgId,
            userId: user.id,
            type: "STALLED",
            title: "Project stalled",
            message: `Project stalled: ${project.name} has low progress (${project.progress}%)`,
            link: `/projects/${project.id}`,
          },
        })
        totalCreated++
      }
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
    for (const user of users) {
      const existing = await prisma.notification.findFirst({
        where: {
          organizationId: orgId,
          userId: user.id,
          type: "DEADLINE",
          message: { contains: task.title },
          createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            organizationId: orgId,
            userId: user.id,
            type: "DEADLINE",
            title: "Deadline approaching",
            message: `Deadline approaching: ${task.title} is due within 3 days`,
            link: `/tasks/${task.id}`,
          },
        })
        totalCreated++
      }
    }
  }

  // Update the last generation timestamp
  await prisma.organization.update({
    where: { id: orgId },
    data: { lastNotificationGeneration: now },
  })

  return totalCreated
}
