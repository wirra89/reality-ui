'use client'

import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

type Props = {
  score: number
  size?: number
}

export function ScoreRing({ score, size = 88 }: Props) {
  const r = (size / 2) - 8
  const circ = 2 * Math.PI * r
  const progress = useMotionValue(0)
  const dash = useTransform(progress, v => `${(v / 100) * circ} ${circ}`)

  useEffect(() => {
    const controls = animate(progress, score, { duration: 1, ease: 'easeOut' })
    return controls.stop
  }, [score, progress])

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={5}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="#b090ff"
          strokeWidth={5}
          strokeDasharray={dash}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-semibold text-white leading-none">{score}</p>
        <p className="text-[9px] uppercase tracking-[0.2em] text-[--text-dim] mt-0.5">Clarity</p>
      </div>
    </div>
  )
}
