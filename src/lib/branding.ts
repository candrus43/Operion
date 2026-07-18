import { existsSync, readdirSync } from "fs"
import { join } from "path"

const BRANDING_DIR = join(process.cwd(), "public", "uploads", "branding")
const LOGO_PREFIX = "logo."

/**
 * Checks the filesystem for an uploaded logo file.
 * Returns the public URL path (e.g. /uploads/branding/logo.png) or null.
 */
export function getBranding(): { logoUrl: string | null } {
  try {
    if (!existsSync(BRANDING_DIR)) {
      return { logoUrl: null }
    }

    const files = readdirSync(BRANDING_DIR)
    const logoFile = files.find((f) => f.startsWith(LOGO_PREFIX))

    if (!logoFile) {
      return { logoUrl: null }
    }

    return { logoUrl: `/uploads/branding/${logoFile}` }
  } catch {
    return { logoUrl: null }
  }
}
