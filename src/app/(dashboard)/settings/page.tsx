import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getBranding } from "@/lib/branding"
import { LogoUploader } from "./logo-uploader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { logoUrl } = getBranding()

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organization&apos;s branding and preferences.
        </p>
      </div>

      <Separator className="bg-[#262626]" />

      {/* Branding Section */}
      <Card className="border-[#262626] bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-lg">Branding</CardTitle>
          <CardDescription>
            Customize how Operion appears to you and your team. Upload your company logo to
            replace the default brand icon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUploader initialLogoUrl={logoUrl} />
        </CardContent>
      </Card>
    </div>
  )
}
