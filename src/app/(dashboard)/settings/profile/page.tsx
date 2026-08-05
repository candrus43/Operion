"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, User, Lock } from "lucide-react"
import { toast } from "sonner"
import { SettingsNav } from "../settings-nav"

export default function ProfileSettingsPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()

  const [profileName, setProfileName] = useState("")
  const [profileEmail, setProfileEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileInitialized, setProfileInitialized] = useState(false)

  // Initialize profile fields from session
  useEffect(() => {
    if (session?.user && !profileInitialized) {
      setProfileName(session.user.name || "")
      setProfileEmail(session.user.email || "")
      setProfileInitialized(true)
    }
  }, [session, profileInitialized])

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session?.user) {
    router.replace("/login")
    return null
  }

  const hasPassword = (session.user as any).hasPassword ?? true

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toast.error("Name is required")
      return
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    setSavingProfile(true)
    try {
      const body: Record<string, string> = {
        name: profileName.trim(),
        email: profileEmail.trim(),
      }

      if (newPassword) {
        body.newPassword = newPassword
        if (hasPassword && currentPassword) {
          body.currentPassword = currentPassword
        }
      }

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to update profile")
        return
      }

      toast.success("Profile updated successfully")

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      await update()
    } catch (err) {
      console.error("Profile update failed:", err)
      toast.error("Failed to update profile")
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <SettingsNav />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update your name, email address, and password.
        </p>
      </div>

      <Separator className="bg-[#262626]" />

      <Card className="border-[#262626] glass">
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
          <CardDescription>
            Your name and email are visible to your team members.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name & Email */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name" className="text-sm text-muted-foreground">
                Name
              </Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your name"
                className="border-[#262626] bg-[#0d0d0d] text-white placeholder:text-muted-foreground focus-visible:ring-blue-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email" className="text-sm text-muted-foreground">
                Email
              </Label>
              <Input
                id="profile-email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="your@email.com"
                className="border-[#262626] bg-[#0d0d0d] text-white placeholder:text-muted-foreground focus-visible:ring-blue-500/30"
              />
            </div>
          </div>

          <Separator className="bg-[#262626]" />

          {/* Password Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-white">
                {hasPassword ? "Change Password" : "Set a Password"}
              </h3>
            </div>
            {!hasPassword && (
              <p className="text-xs text-muted-foreground -mt-2">
                Your account was created via OAuth. Set a password to also be able to sign in with email.
              </p>
            )}

            {hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-sm text-muted-foreground">
                  Current Password
                </Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="border-[#262626] bg-[#0d0d0d] text-white placeholder:text-muted-foreground focus-visible:ring-blue-500/30"
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm text-muted-foreground">
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="border-[#262626] bg-[#0d0d0d] text-white placeholder:text-muted-foreground focus-visible:ring-blue-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm text-muted-foreground">
                  Confirm New Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="border-[#262626] bg-[#0d0d0d] text-white placeholder:text-muted-foreground focus-visible:ring-blue-500/30"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-[#262626]" />

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {savingProfile ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <User className="h-4 w-4 mr-2" />
              )}
              {savingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
