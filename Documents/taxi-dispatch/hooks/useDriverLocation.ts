'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from './useRealtime'
import type { Driver } from '@/lib/types'

export function useDriverLocation(driverId: string | null) {
  const [driver, setDriver] = useState<Pick<Driver, 'current_lat' | 'current_lng' | 'status'> | null>(null)

  useEffect(() => {
    if (!driverId) return
    const supabase = createClient()
    supabase
      .from('drivers')
      .select('current_lat, current_lng, status')
      .eq('id', driverId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setDriver(data)
      })
  }, [driverId])

  useRealtime({
    table: 'drivers',
    filter: driverId ? `id=eq.${driverId}` : 'id=eq.null',
    onUpdate: (payload) => {
      if (!driverId) return
      const d = payload.new as Driver
      setDriver({ current_lat: d.current_lat, current_lng: d.current_lng, status: d.status })
    },
  })

  return driver
}
