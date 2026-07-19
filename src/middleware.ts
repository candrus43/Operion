import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAuth = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") || 
                     req.nextUrl.pathname.startsWith("/register")
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth")
  const isPublicPage = req.nextUrl.pathname === "/" ||
                       req.nextUrl.pathname === "/pricing"

  if (isApiAuth) return NextResponse.next()

  if (!isAuth && !isAuthPage && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isAuth && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
}
