"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loader2, CheckCircle, XCircle, Shield, ArrowRight, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"

type Status = "loading" | "validating" | "valid" | "expired" | "revoked" | "invalid" | "activating" | "error"

function SupportAccessInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status: authStatus, update } = useSession()
  const [status, setStatus] = useState<Status>("loading")
  const [orgName, setOrgName] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [supportData, setSupportData] = useState<any>(null)

  const token = searchParams.get("token")

  useEffect(() => {
    if (!token) {
      setStatus("invalid")
      setErrorMessage("No access token provided.")
      return
    }

    if (authStatus === "loading") return

    const validate = async () => {
      setStatus("validating")
      try {
        const res = await fetch(`/api/support/access?token=${encodeURIComponent(token)}`)
        const data = await res.json()

        if (!res.ok) {
          if (data.reason === "expired") {
            setStatus("expired")
            setErrorMessage(data.error)
          } else if (data.reason === "revoked") {
            setStatus("revoked")
            setErrorMessage(data.error)
          } else {
            setStatus("invalid")
            setErrorMessage(data.error || "Invalid access token.")
          }
          return
        }

        if (data.valid) {
          setOrgName(data.orgName)
          setSupportData(data)

          if (!session?.user) {
            // Not authenticated — redirect to login, then come back here
            setStatus("valid")
            return
          }

          // Activate support mode via session update
          setStatus("activating")
          try {
            await update({
              isSupportMode: true,
              supportOrgId: data.supportOrgId,
              supportPermissions: data.supportPermissions,
              supportTokenId: data.supportTokenId,
              supportExpiresAt: data.supportExpiresAt,
              supportActorId: (session.user as any).id,
            })

            // Redirect to the target org's dashboard
            router.push("/home")
          } catch (err) {
            console.error("Failed to activate support mode:", err)
            setStatus("error")
            setErrorMessage("Failed to activate support mode. Please try again.")
          }
        }
      } catch (err) {
        console.error("Token validation failed:", err)
        setStatus("error")
        setErrorMessage("Failed to validate access token. Please try again.")
      }
    }

    validate()
  }, [token, authStatus, session, update, router])

  // Build login URL that redirects back here
  const loginUrl = `/login?callbackUrl=/support/access?token=${encodeURIComponent(token || "")}`

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080808]">
      <div className="w-full max-w-md mx-4">
        <div className="rounded-xl border border-[#262626] bg-[#111111] p-8 shadow-2xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 mb-4">
              <Shield className="h-7 w-7 text-blue-400" />
            </div>
            <h1 className="text-xl font-semibold text-white">Operion Support Access</h1>
          </div>

          {/* Loading / Validating */}
          {(status === "loading" || status === "validating" || status === "activating") && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              <p className="text-sm text-muted-foreground">
                {status === "loading" ? "Loading..." :
                 status === "validating" ? "Validating access token..." :
                 "Activating support mode..."}
              </p>
            </div>
          )}

          {/* Token valid, user not authenticated */}
          {status === "valid" && !session?.user && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <CheckCircle className="h-6 w-6 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-sm text-white font-medium mb-1">
                  Access to: {orgName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sign in to your support account to access this organization.
                </p>
              </div>
              <Button
                onClick={() => router.push(loginUrl)}
                className="bg-blue-600 hover:bg-blue-700 text-white mt-2"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In to Continue
              </Button>
            </div>
          )}

          {/* Expired, Revoked, Invalid, Error */}
          {(status === "expired" || status === "revoked" || status === "invalid" || status === "error") && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                {status === "expired" ? (
                  <XCircle className="h-6 w-6 text-amber-400" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-400" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-white font-medium mb-1">
                  {status === "expired" ? "Access Expired" :
                   status === "revoked" ? "Access Revoked" :
                   status === "invalid" ? "Invalid Access" : "Something Went Wrong"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {errorMessage}
                </p>
              </div>
              <Button
                onClick={() => router.push("/login")}
                variant="outline"
                className="border-[#262626] bg-[#1a1a1a] hover:bg-[#222] text-muted-foreground mt-2"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Go to Login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SupportAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#080808]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      }
    >
      <SupportAccessInner />
    </Suspense>
  )
}
