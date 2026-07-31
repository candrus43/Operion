import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { ContentHub } from "./content-hub"
import { LINKEDIN_CONTENT_TEMPLATES } from "@/lib/content-templates"

export default async function ContentPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session.user as any).role !== "OWNER") redirect("/home")

  let posts = await prisma.contentPost.findMany({
    orderBy: { createdAt: "desc" },
  })

  // Give every workspace a useful starting library, without duplicating templates
  // for returning admins who have already created or kept posts.
  if (posts.length === 0) {
    await prisma.contentPost.createMany({
      data: LINKEDIN_CONTENT_TEMPLATES.map((template) => ({
        title: template.title,
        body: template.body,
        status: "DRAFT",
        platform: "LINKEDIN",
      })),
    })
    posts = await prisma.contentPost.findMany({ orderBy: { createdAt: "desc" } })
  }

  // Serialize dates for client component
  const serialized = posts.map((p) => ({
    ...p,
    scheduledDate: p.scheduledDate?.toISOString() || null,
    publishedDate: p.publishedDate?.toISOString() || null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))

  return <ContentHub initialPosts={serialized} />
}
