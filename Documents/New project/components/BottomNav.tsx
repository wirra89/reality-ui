'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'Home', mark: '01' },
  { href: '/decode', label: 'Decode', mark: '02' },
  { href: '/lenses', label: 'Lenses', mark: '03' },
  { href: '/history', label: 'History', mark: '04' },
  { href: '/checkin', label: 'Check In', mark: '05' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-4 pb-[calc(0.85rem+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-5 rounded-3xl border border-white/10 bg-black/70 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-2xl">
        {NAV_ITEMS.map(item => {
          const active = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center rounded-2xl text-xs transition-all ${
                active
                  ? 'bg-white text-black shadow-lg shadow-violet-500/20'
                  : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              <span className="font-mono text-[10px]">{item.mark}</span>
              <span className="font-semibold">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
