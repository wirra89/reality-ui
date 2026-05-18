'use client'

type Props = {
  label: string
  value: number
  onChange: (value: number) => void
  lowLabel: string
  highLabel: string
}

export function SliderInput({ label, value, onChange, lowLabel, highLabel }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-[--text]">{label}</span>
        <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-xs font-semibold text-violet-200">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-1.5 w-full cursor-pointer accent-violet-400"
      />
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-[--text-dim]">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  )
}
