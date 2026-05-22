'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RideStatusBadge } from '@/components/RideStatusBadge'
import { formatPrice } from '@/lib/pricing'
import type { Ride } from '@/lib/types'

export default function DriverHistoryPage() {
  const router = useRouter()
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [totalEarnings, setTotalEarnings] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const { data: driverData } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!driverData) return

      const { data } = await supabase
        .from('rides')
        .select('*, customer:profiles!customer_id(full_name, phone)')
        .eq('driver_id', driverData.id)
        .in('status', ['completed', 'cancelled'])
        .order('requested_at', { ascending: false })
        .limit(50)

      const rows = (data ?? []) as Ride[]
      setRides(rows)
      setTotalEarnings(
        rows.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.final_price ?? 0), 0)
      )
      setLoading(false)
    })
  }, [])

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/driver/dashboard')} className="text-taxi-muted hover:text-white">←</button>
        <h1 className="text-xl font-bold">Ride History</h1>
      </div>

      {!loading && (
        <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-1">Total Earnings</p>
          <p className="text-3xl font-bold text-taxi-yellow">{formatPrice(totalEarnings, 'EUR')}</p>
          <p className="text-taxi-muted text-sm">{rides.filter(r => r.status === 'completed').length} completed rides</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-taxi-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="space-y-3">
        {rides.map(ride => {
          const customer = ride.customer as { full_name?: string } | undefined
          return (
            <div key={ride.id} className="bg-taxi-card border border-taxi-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <RideStatusBadge status={ride.status} />
                <span className="text-taxi-muted text-xs">
                  {new Date(ride.requested_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-white">📍 {ride.pickup_address}</p>
              <p className="text-sm text-taxi-muted">→ {ride.destination_address}</p>
              {customer?.full_name && (
                <p className="text-xs text-taxi-muted mt-1">Customer: {customer.full_name}</p>
              )}
              {ride.final_price && (
                <p className="text-taxi-yellow font-bold mt-2">{formatPrice(ride.final_price, 'EUR')}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
