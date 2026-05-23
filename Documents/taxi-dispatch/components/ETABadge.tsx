import { formatETA } from '@/hooks/useETA'

interface ETABadgeProps {
  seconds: number | null
  label?: string
  className?: string
}

export function ETABadge({ seconds, label = 'ETA', className = '' }: ETABadgeProps) {
  if (seconds === null) return null

  return (
    <span
      className={`inline-flex items-center gap-1.5 bg-taxi-yellow/10 border border-taxi-yellow/40 text-taxi-yellow text-xs font-semibold px-2.5 py-1 rounded-full ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-taxi-yellow animate-pulse" />
      {label}: {formatETA(seconds)}
    </span>
  )
}
