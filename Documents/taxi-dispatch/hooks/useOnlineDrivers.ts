'use client'

import { useState, useEffect, useCallback } from 'react'
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
      .then(({ data, error }) => {
        if (error) console.error('[useOnlineDrivers] fetch error:', error)
        setDrivers((data ?? []) as Driver[])
        setLoading(false)
      })
  }, [])

  // Realtime payloads don't include the profile join — refetch when needed
  const fetchAndUpsert = useCallback(async (id: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('drivers')
      .select('*, profile:profiles(*)')
      .eq('id', id)
      .single()
    if (error) { console.error('[useOnlineDrivers] refetch error:', error); return }
    const driver = data as Driver
    if (!driver.is_active || driver.status === 'offline') {
      setDrivers(prev => prev.filter(d => d.id !== driver.id))
    } else {
      setDrivers(prev => {
        const idx = prev.findIndex(d => d.id === driver.id)
        if (idx >= 0) return prev.map(d => d.id === driver.id ? driver : d)
        return [...prev, driver]
      })
    }
  }, [])

  useRealtime({
    table: 'drivers',
    onUpdate: (payload) => {
      const updated = payload.new as Driver
      if (updated.status === 'offline') {
        setDrivers(prev => prev.filter(d => d.id !== updated.id))
        return
      }
      setDrivers(prev => {
        const idx = prev.findIndex(d => d.id === updated.id)
        if (idx >= 0) {
          // Fast path: keep existing profile, update driver fields in place
          return prev.map(d => d.id === updated.id ? { ...d, ...updated } : d)
        }
        // Driver just came online and wasn't in the list — fetch with profile
        fetchAndUpsert(updated.id)
        return prev
      })
    },
    onInsert: (payload) => {
      const driver = payload.new as Driver
      if (driver.status !== 'offline' && driver.is_active) fetchAndUpsert(driver.id)
    },
  })

  return { drivers, loading }
}
