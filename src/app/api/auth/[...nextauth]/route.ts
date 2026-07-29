import { handlers } from "@/lib/auth"
import { NextRequest } from "next/server"

async function handleWithLogging(req: NextRequest, method: "GET" | "POST") {
  const url = req.nextUrl.pathname
  console.log(`[AUTH ${method}] ${url}`)

  try {
    const handler = method === "GET" ? handlers.GET : handlers.POST
    const res = await handler(req)
    console.log(`[AUTH ${method}] ${url} → status: ${res.status}`)

    // Log cookie headers for debugging session persistence
    const setCookie = res.headers.getSetCookie?.() || res.headers.get("set-cookie")
    if (setCookie) {
      const cookieStr = Array.isArray(setCookie) ? setCookie.join("; ") : String(setCookie)
      console.log(`[AUTH ${method}] ${url} → set-cookie: ${cookieStr.substring(0, 300)}`)
    }

    return res
  } catch (e) {
    console.error(`[AUTH ${method}] ${url} → ERROR:`, e)
    const message = e instanceof Error ? e.message : "Internal auth error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    })
  }
}

export async function GET(req: NextRequest) {
  return handleWithLogging(req, "GET")
}

export async function POST(req: NextRequest) {
  return handleWithLogging(req, "POST")
}
