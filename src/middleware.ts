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
                       req.nextUrl.pathname === "/terms" ||
                       req.nextUrl.pathname === "/privacy" ||
                       req.nextUrl.pathname.startsWith("/forgot-password") ||
                       req.nextUrl.pathname.startsWith("/reset-password") ||
                       req.nextUrl.pathname.startsWith("/accept-invite") ||
                       req.nextUrl.pathname.startsWith("/support/access") ||
                       req.nextUrl.pathname === "/admin/login"

  const isDemoRoute = req.nextUrl.pathname === "/api/demo"
  const isDebugRoute = req.nextUrl.pathname.startsWith("/api/debug")
  const isStripeWebhook = req.nextUrl.pathname === "/api/stripe/webhook"
  const isStripeApi = req.nextUrl.pathname.startsWith("/api/stripe/")
  const isSupportAccessApi = req.nextUrl.pathname === "/api/support/access"
  const isAdminSetupApi = req.nextUrl.pathname === "/api/admin/setup"

  // Skip enforcement for public routes, auth, etc.
  const isExemptRoute = isApiAuth || isRegisterApi || isStripeWebhook || isStripeApi || isSupportAccessApi || isAdminSetupApi ||
                        isAuthPage || isPublicPage || isDemoRoute || isDebugRoute

  if (isApiAuth || isRegisterApi || isStripeWebhook || isSupportAccessApi || isAdminSetupApi) return NextResponse.next()

  if (!isAuth && !isAuthPage && !isPublicPage && !isDemoRoute && !isDebugRoute) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isAuth && isAuthPage) {
    const role = (req.auth?.user as any)?.role
    const isSuperAdmin = (req.auth?.user as any)?.isSuperAdmin
    const destination = isSuperAdmin ? "/admin" : (role === "EXECUTIVE_ASSISTANT" ? "/ea" : "/home")
    return NextResponse.redirect(new URL(destination, req.url))
  }

  // Restrict /admin routes to super admins only
  if (isAuth && req.nextUrl.pathname.startsWith("/admin")) {
    // Allow /admin/login through without super admin check
    if (req.nextUrl.pathname === "/admin/login") return NextResponse.next()
    const isSuperAdmin = (req.auth?.user as any)?.isSuperAdmin
    if (!isSuperAdmin) {
      const role = (req.auth?.user as any)?.role
      const destination = role === "EXECUTIVE_ASSISTANT" ? "/ea" : "/home"
      return NextResponse.redirect(new URL(destination, req.url))
    }
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
