/**
 * Cinematic auth shell — aurora backdrop + grid fade, matching the landing page.
 * Wraps login/register/password/auth-adjacent pages in the Operion visual language.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08080a] text-white antialiased">
      {/* Aurora */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora-a absolute -left-[20%] top-[-25%] h-[40rem] w-[40rem] rounded-full bg-violet-600/[0.15] blur-[90px] md:blur-[150px]" />
        <div className="aurora-b absolute -right-[15%] top-[15%] h-[34rem] w-[34rem] rounded-full bg-indigo-500/[0.11] blur-[80px] md:blur-[140px]" />
        <div className="aurora-c absolute bottom-[-25%] left-[25%] h-[30rem] w-[30rem] rounded-full bg-sky-500/[0.08] blur-[70px] md:blur-[120px]" />
      </div>
      <div className="grid-fade pointer-events-none absolute inset-0" />
      {/* Horizon vignette for depth */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#08080a] via-[#08080a]/70 to-transparent" />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        {children}
      </div>
    </div>
  )
}
