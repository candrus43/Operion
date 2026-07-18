import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { DocumentForm } from "../../document-form"

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const orgId = (session.user as any).organizationId

  const [document, entities, projects] = await Promise.all([
    prisma.document.findFirst({
      where: { id, organizationId: orgId },
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
  ])

  if (!document) notFound()

  return (
    <DocumentForm
      entities={entities}
      projects={projects}
      document={document}
      isEdit
    />
  )
}
