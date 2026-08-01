import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const url = new URL("/demo-login", req.url)
  return NextResponse.redirect(url)
}
