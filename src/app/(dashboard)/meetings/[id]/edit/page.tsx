import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { MeetingForm } from "../../meeting-form"

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const orgId = (session.user as any).organizationId

  const [meeting, projects] = await Promise.all([
    prisma.meeting.findFirst({
      where: { id, organizationId: orgId },
    }),
    prisma.project.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!meeting) notFound()

  return (
    <MeetingForm
      projects={projects}
      meeting={meeting}
      isEdit
    />
  )
}
