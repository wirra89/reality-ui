'use client'

import { useState, useEffect, useCallback } from 'react'
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
      .then(({ data, error }) => {
        if (error) console.error('[usePendingRides] fetch error:', error)
        setRides((data ?? []) as Ride[])
        setLoading(false)
      })
  }, [])

  // Realtime payloads don't include joins — refetch full ride when new one arrives
  const fetchAndUpsertRide = useCallback(async (id: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('rides')
      .select('*, customer:profiles!customer_id(*), driver:drivers(*, profile:profiles(*))')
      .eq('id', id)
      .single()
    if (error) { console.error('[usePendingRides] refetch error:', error); return }
    const ride = data as Ride
    if (!ACTIVE_STATUSES.includes(ride.status)) {
      setRides(prev => prev.filter(r => r.id !== ride.id))
    } else {
      setRides(prev => {
        const idx = prev.findIndex(r => r.id === ride.id)
        if (idx >= 0) return prev.map(r => r.id === ride.id ? ride : r)
        return [ride, ...prev]
      })
    }
  }, [])

  useRealtime({
    table: 'rides',
    onInsert: (payload) => fetchAndUpsertRide((payload.new as Ride).id),
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
