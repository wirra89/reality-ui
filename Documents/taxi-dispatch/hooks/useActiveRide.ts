'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from './useRealtime'
import type { Ride } from '@/lib/types'

const ACTIVE_STATUSES = ['requested', 'assigned', 'driver_arriving', 'arrived', 'in_progress']

export function useActiveRide(customerId: string | null) {
  const [ride, setRide] = useState<Ride | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!customerId) { setLoading(false); return }

    const supabase = createClient()
    supabase
      .from('rides')
      .select('*, driver:drivers(*, profile:profiles(*))')
      .eq('customer_id', customerId)
      .in('status', ACTIVE_STATUSES)
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setRide(data as Ride | null)
        setLoading(false)
      })
  }, [customerId])

  useRealtime({
    table: 'rides',
    filter: customerId ? `customer_id=eq.${customerId}` : undefined,
    onUpdate: (payload) => {
      const updated = payload.new as Ride
      setRide(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
    },
  })

  return { ride, loading }
}
