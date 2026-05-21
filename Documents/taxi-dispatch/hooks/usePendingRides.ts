'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from './useRealtime'
import type { Ride } from '@/lib/types'

const ACTIVE_STATUSES = ['requested', 'assigned', 'driver_arriving', 'arrived', 'in_progress']

export function usePendingRides() {
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('rides')
      .select('*, customer:profiles!customer_id(*), driver:drivers(*, profile:profiles(*))')
      .in('status', ACTIVE_STATUSES)
      .order('requested_at', { ascending: true })
      .then(({ data }) => {
        setRides((data ?? []) as Ride[])
        setLoading(false)
      })
  }, [])

  useRealtime({
    table: 'rides',
    onInsert: (payload) => setRides(prev => [payload.new as Ride, ...prev]),
    onUpdate: (payload) => {
      const updated = payload.new as Ride
      if (!ACTIVE_STATUSES.includes(updated.status)) {
        setRides(prev => prev.filter(r => r.id !== updated.id))
      } else {
        setRides(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
      }
    },
  })

  return { rides, loading }
}
