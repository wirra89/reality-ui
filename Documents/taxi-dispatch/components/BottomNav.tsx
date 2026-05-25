'use client'

import { usePathname, useRouter } from 'next/navigation'

type Role = 'customer' | 'driver'

interface Tab {
  icon: string
  label: string
  href: string
}

const CUSTOMER_TABS: Tab[] = [
  { icon: '🏠', label: 'Home',    href: '/customer/dashboard' },
  { icon: '🚕', label: 'Ride',    href: '/customer/request' },
  { icon: '📋', label: 'History', href: '/customer/history' },
  { icon: '👤', label: 'Profile', href: '/customer/profile' },
]

const DRIVER_TABS: Tab[] = [
  { icon: '🏠', label: 'Dashboard', href: '/driver/dashboard' },
  { icon: '📋', label: 'History',   href: '/driver/history' },
  { icon: '👤', label: 'Profile',   href: '/driver/profile' },
]

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname.includes('/ride/')) return null

  const tabs = role === 'customer' ? CUSTOMER_TABS : DRIVER_TABS

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40">
      <div className="max-w-md mx-auto bg-[#151515] border-t border-taxi-border">
        <div className="flex">
          {tabs.map(tab => {
            const active = pathname === tab.href
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
                  active ? 'text-taxi-yellow' : 'text-taxi-muted hover:text-white'
                }`}
              >
                <span className="text-xl leading-none">{tab.icon}</span>
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
