"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { SupportModeBanner } from "@/components/support-mode-banner"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const { data: session } = useSession()
  const isPitchAccount = session?.user?.email === "morgan@blackstonepartners.demo"

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#08080a]">
      {/* Cinematic ambient background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="aurora-a absolute -left-[18%] top-[-22%] h-[44rem] w-[44rem] rounded-full bg-violet-600/[0.13] blur-[90px] md:blur-[150px]" />
        <div className="aurora-b absolute -right-[14%] top-[8%] h-[36rem] w-[36rem] rounded-full bg-indigo-500/[0.09] blur-[80px] md:blur-[140px]" />
        <div className="aurora-c absolute bottom-[-24%] left-[30%] h-[32rem] w-[32rem] rounded-full bg-sky-500/[0.07] blur-[70px] md:blur-[130px]" />
      </div>

      {/* Desktop Sidebar */}
      <div className="relative z-10 hidden md:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-3 left-3 z-50 md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-60">
          <Sidebar collapsed={false} onToggle={() => {}} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Topbar user={session?.user} />
        {!isPitchAccount && <SupportModeBanner />}
        {!isPitchAccount && <ImpersonationBanner />}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
