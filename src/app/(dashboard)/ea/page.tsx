import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { EAWorkspace } from "./ea-workspace"

export default async function EAPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  // Fix 2: Gate EA Workspace to EA + OWNER roles only
  const userRole = (session.user as any).role ?? ""
  if (userRole !== "EXECUTIVE_ASSISTANT" && userRole !== "OWNER") {
    redirect("/home")
  }

  const userId = (session.user as any).id
  const orgId = (session.user as any).organizationId
  const now = new Date()

  let dailyTasks: any[] = []
  let blockedWaitingTasks: any[] = []
  let submittedForReview: any[] = []
  let upcomingMeetings: any[] = []
  let completedTasks: any[] = []
  let users: any[] = []
  let projects: any[] = []

  try {
    // Daily Task Queue: tasks assigned to current user that are TODO or IN_PROGRESS
    dailyTasks = await prisma.task.findMany({
      where: {
        organizationId: orgId,
        assigneeId: userId,
        status: { in: ["TODO", "IN_PROGRESS"] },
      },
      include: {
        project: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }],
    })

    // Blocked & Waiting: tasks with WAITING_ON status
    blockedWaitingTasks = await prisma.task.findMany({
      where: {
        organizationId: orgId,
        status: "WAITING_ON",
      },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
        waitingOnUser: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }],
      take: 20,
    })

    // Submitted for Review: tasks with READY_FOR_REVIEW status
    submittedForReview = await prisma.task.findMany({
      where: {
        organizationId: orgId,
        status: "READY_FOR_REVIEW",
      },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }],
      take: 20,
    })

    // Upcoming meetings for next 7 days
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    upcomingMeetings = await prisma.meeting.findMany({
      where: {
        organizationId: orgId,
        date: { gte: now, lte: sevenDaysFromNow },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    })

    // Follow-Up: tasks completed in last 7 days by current user
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    completedTasks = await prisma.task.findMany({
      where: {
        organizationId: orgId,
        assigneeId: userId,
        status: "DONE",
        updatedAt: { gte: sevenDaysAgo },
      },
      include: {
        project: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    })

    // Users for assignment dropdown
    users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, role: true, email: true },
    })

    // Projects for dropdown
    projects = await prisma.project.findMany({
      where: { organizationId: orgId, status: { not: "COMPLETED" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
  } catch (err) {
    console.error("EA workspace fetch failed:", err)
    // All arrays already initialized to [] — page renders with empty state
  }

  return (
    <EAWorkspace
      userId={userId}
      orgId={orgId}
      dailyTasks={JSON.parse(JSON.stringify(dailyTasks))}
      blockedWaitingTasks={JSON.parse(JSON.stringify(blockedWaitingTasks))}
      submittedForReview={JSON.parse(JSON.stringify(submittedForReview))}
      upcomingMeetings={JSON.parse(JSON.stringify(upcomingMeetings))}
      completedTasks={JSON.parse(JSON.stringify(completedTasks))}
      users={JSON.parse(JSON.stringify(users))}
      projects={JSON.parse(JSON.stringify(projects))}
      userRole={(session.user as any).role || "STAFF"}
    />
  )
}
