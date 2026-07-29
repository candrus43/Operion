"use client"

interface RingProps {
  /** Value 0–100 */
  value: number
  color: string
  size?: number
  strokeWidth?: number
  label?: string
  /** Optional total label (e.g. "3 entities") */
  countLabel?: string
}

export function ProgressRing({
  value,
  color,
  size = 80,
  strokeWidth = 6,
  label,
  countLabel,
}: RingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      {label && (
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      )}
      {countLabel && (
        <span className="text-xs font-semibold text-foreground">{countLabel}</span>
      )}
    </div>
  )
}

interface TripleRingProps {
  entityProgress: number
  contactProgress: number
  taskProgress: number
  entityLabel?: string
  contactLabel?: string
  taskLabel?: string
  size?: number
}

export function TripleProgressRing({
  entityProgress,
  contactProgress,
  taskProgress,
  entityLabel = "Entities",
  contactLabel = "Contacts",
  taskLabel = "Tasks",
  size = 64,
}: TripleRingProps) {
  return (
    <div className="flex items-center gap-6 justify-center">
      <ProgressRing
        value={entityProgress}
        color="#3b82f6"
        size={size}
        strokeWidth={5}
        label={entityLabel}
      />
      <ProgressRing
        value={contactProgress}
        color="#22c55e"
        size={size}
        strokeWidth={5}
        label={contactLabel}
      />
      <ProgressRing
        value={taskProgress}
        color="#f59e0b"
        size={size}
        strokeWidth={5}
        label={taskLabel}
      />
    </div>
  )
}
