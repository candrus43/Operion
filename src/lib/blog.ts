import fs from "fs"
import path from "path"

export interface BlogPost {
  slug: string
  title: string
  date: string
  category: string
  description: string
  readTime: string
  placeholder?: boolean
  content?: string
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog")

function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const trimmed = raw.trim()
  if (!trimmed.startsWith("---")) {
    return { data: {}, content: trimmed }
  }
  const end = trimmed.indexOf("---", 3)
  if (end === -1) {
    return { data: {}, content: trimmed }
  }
  const frontmatterBlock = trimmed.slice(3, end).trim()
  const content = trimmed.slice(end + 3).trim()

  const data: Record<string, string> = {}
  for (const line of frontmatterBlock.split("\n")) {
    const colonIndex = line.indexOf(":")
    if (colonIndex === -1) continue
    const key = line.slice(0, colonIndex).trim()
    let value = line.slice(colonIndex + 1).trim()
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    data[key] = value
  }
  return { data, content }
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return []

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"))

  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf-8")
    const { data, content } = parseFrontmatter(raw)
    return {
      slug: data.slug || file.replace(/\.md$/, ""),
      title: data.title || "Untitled",
      date: data.date || "",
      category: data.category || "Uncategorized",
      description: data.description || "",
      readTime: data.readTime || "",
      placeholder: data.placeholder === "true",
      content,
    } as BlogPost
  })

  return posts.sort((a, b) => (b.date > a.date ? 1 : -1))
}

export function getPostBySlug(slug: string): BlogPost | null {
  const posts = getAllPosts()
  return posts.find((p) => p.slug === slug && !p.placeholder) || null
}
