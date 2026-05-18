'use client'

import { useEffect } from 'react'
import { initNotifications } from '@/lib/notifications'

export function AppInit() {
  useEffect(() => {
    initNotifications()
  }, [])
  return null
}
