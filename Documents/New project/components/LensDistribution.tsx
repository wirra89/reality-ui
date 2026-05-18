import { getLens } from '@/lib/lenses'
import type { LensId } from '@/types/reality'

interface LensDistributionProps {
  items: Array<{ lens: LensId; count: number }>
}

export function LensDistribution({ items }: LensDistributionProps) {
  if (items.length === 0) return null
  const max = items[0].count

  return (
    <div className="space-y-2">
      {items.map(({ lens, count }) => {
        const pct = Math.round((count / max) * 100)
        const name = getLens(lens)?.name ?? lens
        return (
          <div key={lens} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-[10px] text-[--text-dim]">
              {name}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-violet-400/60 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-4 text-right text-[10px] text-[--text-dim]">{count}</span>
          </div>
        )
      })}
    </div>
  )
}
