import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.redirect(new URL("/demo-login", "http://localhost:3000"))
}
