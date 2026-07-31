import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { ContentHub } from "./content-hub"

export default async function ContentPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session.user as any).role !== "OWNER") redirect("/home")

  const posts = await prisma.contentPost.findMany({
    orderBy: { createdAt: "desc" },
  })

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
