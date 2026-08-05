import { cn } from "@/lib/utils"

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

/**
 * Standard dashboard page header in the cinematic landing language:
 * eyebrow label, tight display title, muted description, optional actions.
 */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 flex items-center gap-3">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-violet-400/50" />
            <span className="eyebrow text-white/40">{eyebrow}</span>
          </div>
        )}
        <h1 className="display-tight text-2xl text-white sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/40">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
