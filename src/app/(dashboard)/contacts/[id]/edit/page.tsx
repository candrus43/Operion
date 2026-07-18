import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { ContactForm } from "../../contact-form"

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const orgId = (session.user as any).organizationId

  const [contact, entities] = await Promise.all([
    prisma.contact.findFirst({
      where: { id, organizationId: orgId },
    }),
    prisma.entity.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!contact) notFound()

  return (
    <ContactForm
      entities={entities}
      contact={contact}
      isEdit
    />
  )
}
