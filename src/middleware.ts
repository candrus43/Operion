import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAuth = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") || 
                     req.nextUrl.pathname.startsWith("/register") ||
                     req.nextUrl.pathname === "/demo-login"
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth")
  const isPublicPage = req.nextUrl.pathname === "/" ||
                       req.nextUrl.pathname === "/pricing" ||
                       req.nextUrl.pathname === "/trial-expired"

  const isDemoRoute = req.nextUrl.pathname === "/api/demo"

  if (isApiAuth) return NextResponse.next()

  if (!isAuth && !isAuthPage && !isPublicPage && !isDemoRoute) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isAuth && isAuthPage) {
    return NextResponse.redirect(new URL("/home", req.url))
  }

  // Redirect authenticated users from landing page to dashboard
  if (isAuth && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/home", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
}
