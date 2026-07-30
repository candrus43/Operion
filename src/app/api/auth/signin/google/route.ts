import { auth, signIn } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { applyRateLimit } from "@/lib/rate-limit"

/**
 * Handle GET /api/auth/signin/google
 * 
 * Auth.js v5's render.signin() throws UnknownAction when providerId is set,
 * so we intercept GET requests here and initiate the OAuth flow properly.
 * This fixes the "Connect Google" button in Settings.
 */
export async function GET(req: NextRequest) {
  const limit = await applyRateLimit(req, { maxRequests: 60, windowMs: 60_000 })
  if (limit) return limit

  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/settings"
  
  // Use the server-side signIn to initiate OAuth flow
  return signIn("google", { redirectTo: callbackUrl })
}

export async function POST(req: NextRequest) {
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  // Delegate POST to the standard [...nextauth] handler 
  // by falling through to next-auth's built-in signin action
  return signIn("google", { redirectTo: "/settings" })
}
