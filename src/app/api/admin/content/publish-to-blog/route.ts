import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import fs from "fs"
import path from "path"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if ((session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { id: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const post = await prisma.contentPost.findUnique({
    where: { id: body.id },
  })

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  // Generate slug from title
  const slug = post.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80)

  const today = new Date().toISOString().split("T")[0]
  const category = "Product"

  // Create frontmatter + body as markdown
  const markdown = `---
title: "${post.title.replace(/"/g, '\\"')}"
date: "${today}"
category: "${category}"
description: "${post.body.slice(0, 160).replace(/"/g, '\\"').replace(/\n/g, " ")}"
readTime: "${Math.max(1, Math.ceil(post.body.split(/\s+/).length / 200))} min read"
slug: "${slug}"
---

${post.body}
`

  // Write to content/blog/
  const blogDir = path.join(process.cwd(), "content", "blog")
  if (!fs.existsSync(blogDir)) {
    fs.mkdirSync(blogDir, { recursive: true })
  }

  const filePath = path.join(blogDir, `${slug}.md`)
  fs.writeFileSync(filePath, markdown, "utf-8")

  return NextResponse.json({
    ok: true,
    slug,
    filePath: `content/blog/${slug}.md`,
  })
}
