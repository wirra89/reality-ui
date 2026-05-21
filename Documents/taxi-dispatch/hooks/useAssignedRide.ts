'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from './useRealtime'
import type { Ride } from '@/lib/types'

export function useAssignedRide(driverId: string | null) {
  const [ride, setRide] = useState<Ride | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!driverId) { setLoading(false); return }

    const supabase = createClient()
    supabase
      .from('rides')
      .select('*, customer:profiles!customer_id(*)')
      .eq('driver_id', driverId)
      .in('status', ['assigned', 'driver_arriving', 'arrived', 'in_progress'])
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setRide(data as Ride | null)
        setLoading(false)
      })
  }, [driverId])

  useRealtime({
    table: 'rides',
    filter: driverId ? `driver_id=eq.${driverId}` : undefined,
    onUpdate: (payload) => {
      const updated = payload.new as Ride
      setRide(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
    },
    onInsert: (payload) => {
      setRide(payload.new as Ride)
    },
  })

  return { ride, loading }
}
