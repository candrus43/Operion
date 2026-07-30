import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  if (process.env.ENABLE_DEMO !== "true") {
    return NextResponse.json({ error: "Demo not available" }, { status: 404 });
  }

  const url = new URL("/demo-login", req.url)
  return NextResponse.redirect(url)
}
