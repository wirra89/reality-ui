'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RideStatusBadge } from '@/components/RideStatusBadge'
import { formatPrice } from '@/lib/pricing'
import type { Ride } from '@/lib/types'

export default function DispatcherRidesPage() {
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('rides')
      .select('*, customer:profiles!customer_id(full_name, phone), driver:drivers(car_model, car_plate, profile:profiles(full_name))')
      .order('requested_at', { ascending: false })
      .limit(100)

    if (filter !== 'all') query = query.eq('status', filter)

    query.then(({ data }) => {
      setRides((data ?? []) as Ride[])
      setLoading(false)
    })
  }, [filter])

  const FILTERS = ['all', 'requested', 'assigned', 'in_progress', 'completed', 'cancelled']

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">All Rides</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition capitalize ${
              filter === f
                ? 'bg-taxi-yellow text-black'
                : 'bg-taxi-card border border-taxi-border text-taxi-muted hover:text-white'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading && <p className="text-taxi-muted">Loading...</p>}

      <div className="space-y-2">
        {rides.map(ride => {
          const customer = ride.customer as { full_name?: string; phone?: string } | undefined
          const driver = ride.driver as { car_model?: string; profile?: { full_name?: string } } | undefined
          return (
            <div key={ride.id} className="bg-taxi-card border border-taxi-border rounded-xl p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <RideStatusBadge status={ride.status} />
                  <span className="text-taxi-muted text-xs">
                    {new Date(ride.requested_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-white truncate">📍 {ride.pickup_address}</p>
                <p className="text-sm text-taxi-muted truncate">→ {ride.destination_address}</p>
                <div className="flex gap-4 mt-2 text-xs text-taxi-muted">
                  {customer?.full_name && <span>Customer: {customer.full_name}</span>}
                  {driver?.profile?.full_name && <span>Driver: {driver.profile.full_name}</span>}
                </div>
              </div>
              {ride.estimated_price && (
                <p className="text-taxi-yellow font-bold shrink-0">{formatPrice(ride.estimated_price, 'EUR')}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
