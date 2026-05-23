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
      const activeStatuses = ['assigned', 'driver_arriving', 'arrived', 'in_progress']
      setRide(prev => {
        if (prev?.id === updated.id) {
          // If ride is no longer active (rejected, completed, cancelled), clear it
          if (!activeStatuses.includes(updated.status)) return null
          return { ...prev, ...updated }
        }
        // New assignment: ride just got this driver_id set
        if (activeStatuses.includes(updated.status)) return updated as Ride
        return prev
      })
    },
    onInsert: (payload) => {
      const r = payload.new as Ride
      // Guard: only accept rides actually assigned to this driver
      if (r.driver_id === driverId) setRide(r)
    },
  })

  return { ride, loading }
}
