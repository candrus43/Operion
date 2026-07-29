import { signIn } from "@/lib/auth"
import { NextRequest } from "next/server"

/**
 * Handle GET /api/auth/signin/microsoft
 *
 * Auth.js v5's render.signin() throws UnknownAction when providerId is set,
 * so we intercept GET requests here and initiate the OAuth flow properly.
 */
export async function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/settings"
  return signIn("microsoft-entra-id", { redirectTo: callbackUrl })
}
