'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/useRealtime'
import { RideStatusBadge } from '@/components/RideStatusBadge'
import { ActiveRideTimeline } from '@/components/ActiveRideTimeline'
import { formatPrice } from '@/lib/pricing'
import type { Ride } from '@/lib/types'

export default function CustomerRidePage() {
  const params = useParams()
  const router = useRouter()
  const rideId = params.id as string
  const [ride, setRide] = useState<Ride | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('rides')
      .select('*, driver:drivers(*, profile:profiles(*))')
      .eq('id', rideId)
      .single()
      .then(({ data }) => {
        setRide(data as Ride | null)
        setLoading(false)
      })
  }, [rideId])

  useRealtime({
    table: 'rides',
    filter: `id=eq.${rideId}`,
    onUpdate: (payload) => setRide(prev => prev ? { ...prev, ...payload.new as Ride } : null),
  })

  async function handleCancel() {
    if (!ride) return
    const supabase = createClient()
    await supabase
      .from('rides')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', ride.id)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-taxi-yellow border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!ride) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-taxi-muted">Ride not found.</p>
    </div>
  )

  const driver = ride.driver as (Ride['driver'] & { profile?: { full_name?: string; phone?: string } }) | undefined

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/customer/dashboard')} className="text-taxi-muted hover:text-white">←</button>
        <h1 className="text-xl font-bold">Your Ride</h1>
        <div className="ml-auto"><RideStatusBadge status={ride.status} /></div>
      </div>

      <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-taxi-yellow mt-0.5">●</span>
            <p className="text-sm text-white">{ride.pickup_address}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-taxi-muted mt-0.5">→</span>
            <p className="text-sm text-taxi-muted">{ride.destination_address}</p>
          </div>
        </div>
        {ride.estimated_price && (
          <p className="text-taxi-yellow font-bold text-xl mt-3">~{formatPrice(ride.estimated_price, 'EUR')}</p>
        )}
      </div>

      {driver && (
        <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-4">
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-3">Your Driver</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">{driver.profile?.full_name ?? 'Driver'}</p>
              <p className="text-taxi-muted text-sm">{(driver as {car_model?: string}).car_model} · {(driver as {car_plate?: string}).car_plate}</p>
            </div>
            {driver.profile?.phone && (
              <a href={`tel:${driver.profile.phone}`} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                📞 Call
              </a>
            )}
          </div>
        </div>
      )}

      <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-6">
        <p className="text-xs uppercase tracking-wider text-taxi-muted mb-4">Progress</p>
        <ActiveRideTimeline currentStatus={ride.status} />
      </div>

      {ride.status === 'requested' && (
        <button onClick={handleCancel}
          className="w-full border border-red-800 text-red-400 py-3 rounded-xl text-sm hover:bg-red-900/20 transition">
          Cancel Ride
        </button>
      )}

      {(ride.status === 'completed' || ride.status === 'cancelled') && (
        <button onClick={() => router.push('/customer/dashboard')}
          className="w-full bg-taxi-yellow text-black font-bold py-4 rounded-xl">
          Back to Home
        </button>
      )}
    </div>
  )
}
