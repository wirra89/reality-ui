'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from './useRealtime'
import type { Driver } from '@/lib/types'

export function useOnlineDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('drivers')
      .select('*, profile:profiles(*)')
      .neq('status', 'offline')
      .eq('is_active', true)
      .then(({ data }) => {
        setDrivers((data ?? []) as Driver[])
        setLoading(false)
      })
  }, [])

  useRealtime({
    table: 'drivers',
    onUpdate: (payload) => {
      const updated = payload.new as Driver
      setDrivers(prev => {
        const exists = prev.find(d => d.id === updated.id)
        if (updated.status === 'offline') return prev.filter(d => d.id !== updated.id)
        if (exists) return prev.map(d => d.id === updated.id ? { ...d, ...updated } : d)
        return [...prev, updated]
      })
    },
    onInsert: (payload) => {
      const driver = payload.new as Driver
      if (driver.status !== 'offline') setDrivers(prev => [...prev, driver])
    },
  })

  return { drivers, loading }
}
