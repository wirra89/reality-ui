import { getLens } from '@/lib/lenses'
import type { LensId } from '@/types/reality'

type Props = {
  lensId: LensId
  size?: 'sm' | 'md'
}

export function LensTag({ lensId, size = 'sm' }: Props) {
  const lens = getLens(lensId)
  const name = lens?.name ?? lensId
  return (
    <span
      className={`inline-flex items-center rounded-full border border-violet-300/20 bg-violet-400/10 font-medium text-violet-200 ${
        size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'
      }`}
    >
      {name}
    </span>
  )
}
