'use client'

import { usePathname } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'

const NO_NAV = ['/result', '/clear']

export function NavGuard() {
  const pathname = usePathname()
  if (NO_NAV.some(p => pathname.startsWith(p))) return null
  return <BottomNav />
}
