import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAuth = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") || 
                     req.nextUrl.pathname.startsWith("/register") ||
                     req.nextUrl.pathname === "/demo-login"
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth")
  const isRegisterApi = req.nextUrl.pathname === "/api/register"
  const isPublicPage = req.nextUrl.pathname === "/" ||
                       req.nextUrl.pathname === "/pricing" ||
                       req.nextUrl.pathname === "/trial-expired" ||
                       req.nextUrl.pathname.startsWith("/forgot-password") ||
                       req.nextUrl.pathname.startsWith("/reset-password")

  const isDemoRoute = req.nextUrl.pathname === "/api/demo"
  const isDebugRoute = req.nextUrl.pathname.startsWith("/api/debug")
  const isStripeWebhook = req.nextUrl.pathname === "/api/stripe/webhook"
  const isStripeApi = req.nextUrl.pathname.startsWith("/api/stripe/")

  // Skip enforcement for public routes, auth, etc.
  const isExemptRoute = isApiAuth || isRegisterApi || isStripeWebhook || isStripeApi || 
                        isAuthPage || isPublicPage || isDemoRoute || isDebugRoute

  if (isApiAuth || isRegisterApi || isStripeWebhook) return NextResponse.next()

  if (!isAuth && !isAuthPage && !isPublicPage && !isDemoRoute && !isDebugRoute) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isAuth && isAuthPage) {
    const role = (req.auth?.user as any)?.role
    const destination = role === "EXECUTIVE_ASSISTANT" ? "/ea" : "/home"
    return NextResponse.redirect(new URL(destination, req.url))
  }

  // Redirect authenticated users from landing page to dashboard
  if (isAuth && req.nextUrl.pathname === "/") {
    const role = (req.auth?.user as any)?.role
    const destination = role === "EXECUTIVE_ASSISTANT" ? "/ea" : "/home"
    return NextResponse.redirect(new URL(destination, req.url))
  }

  // Redirect expired users to trial-expired page (skip exempt routes)
  if (isAuth && !isExemptRoute) {
    const subscriptionStatus = req.auth?.user?.subscriptionStatus
    if (subscriptionStatus === "EXPIRED") {
      return NextResponse.redirect(new URL("/trial-expired", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|uploads|dashboard-preview.png|operion-demo.mp4|demo-screenshots).*)"],
}
