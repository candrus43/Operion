import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getBranding } from "@/lib/branding"
import { writeFile, mkdir, readdir, unlink } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"]
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

const EXT_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/svg+xml": "svg",
}

// GET: Return current branding info
export async function GET() {
  const branding = getBranding()
  return NextResponse.json(branding)
}

// POST: Upload logo
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed. Accepted: PNG, JPG, SVG` },
        { status: 400 }
      )
    }

    const ext = EXT_MAP[file.type] || "png"
    const brandingDir = join(process.cwd(), "public", "uploads", "branding")
    const logoFileName = `logo.${ext}`

    await mkdir(brandingDir, { recursive: true })

    // Remove any existing logo file before writing the new one
    if (existsSync(brandingDir)) {
      try {
        const existing = await readdir(brandingDir)
        for (const f of existing) {
          if (f.startsWith("logo.")) {
            await unlink(join(brandingDir, f))
          }
        }
      } catch {
        // ignore cleanup errors
      }
    }

    const filePath = join(brandingDir, logoFileName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const publicPath = `/uploads/branding/${logoFileName}`

    return NextResponse.json({ logoUrl: publicPath })
  } catch (err: any) {
    console.error("Logo upload error:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
