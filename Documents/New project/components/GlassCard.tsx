import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function GlassCard({ children, className = '', onClick }: Props) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/35 backdrop-blur-xl w-full text-left ${className}`}
    >
      {children}
    </Tag>
  )
}
