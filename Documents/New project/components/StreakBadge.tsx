interface StreakBadgeProps {
  streak: number
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) return null
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-violet-300/20 bg-violet-400/[0.09] px-3 py-1">
      <span className="text-sm leading-none text-[--accent]">◆</span>
      <span className="text-xs font-semibold text-[--accent]">{streak}</span>
      <span className="text-[10px] uppercase tracking-wider text-[--text-dim]">day streak</span>
    </div>
  )
}
