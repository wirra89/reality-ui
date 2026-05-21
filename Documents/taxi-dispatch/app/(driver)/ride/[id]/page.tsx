'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/useRealtime'
import { RideStatusBadge } from '@/components/RideStatusBadge'
import { DRIVER_TRANSITIONS } from '@/lib/ride-status'
import { formatPrice } from '@/lib/pricing'
import type { Ride, Driver } from '@/lib/types'

const STATUS_TO_DRIVER_STATUS: Partial<Record<string, string>> = {
  driver_arriving: 'arriving',
  arrived:         'waiting',
  in_progress:     'on_trip',
  completed:       'online',
}

export default function DriverRidePage() {
  const params = useParams()
  const router = useRouter()
  const rideId = params.id as string
  const [ride, setRide] = useState<Ride | null>(null)
  const [driverRecord, setDriverRecord] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('rides').select('*, customer:profiles!customer_id(*)').eq('id', rideId).single(),
      supabase.auth.getUser().then(({ data: { user } }) =>
        user ? supabase.from('drivers').select('*').eq('user_id', user.id).single() : { data: null }
      ),
    ]).then(([{ data: rideData }, { data: driverData }]) => {
      setRide(rideData as Ride | null)
      setDriverRecord(driverData as Driver | null)
      setLoading(false)
    })
  }, [rideId])

  useRealtime({
    table: 'rides',
    filter: `id=eq.${rideId}`,
    onUpdate: (payload) => setRide(prev => prev ? { ...prev, ...payload.new as Ride } : null),
  })

  async function advanceStatus() {
    if (!ride || !driverRecord) return
    const transition = DRIVER_TRANSITIONS[ride.status]
    if (!transition) return

    setAdvancing(true)
    const supabase = createClient()
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { status: transition.next }

    if (transition.next === 'driver_arriving') updates.assigned_at = now
    if (transition.next === 'in_progress') updates.started_at = now
    if (transition.next === 'completed') { updates.completed_at = now; updates.final_price = ride.estimated_price }

    await supabase.from('rides').update(updates).eq('id', ride.id)

    const newDriverStatus = STATUS_TO_DRIVER_STATUS[transition.next]
    if (newDriverStatus) {
      await supabase.from('drivers').update({ status: newDriverStatus }).eq('id', driverRecord.id)
      setDriverRecord(prev => prev ? { ...prev, status: newDriverStatus as Driver['status'] } : null)
    }

    if (transition.next === 'completed') router.push('/driver/dashboard')

    setAdvancing(false)
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

  const transition = DRIVER_TRANSITIONS[ride.status]
  const customer = ride.customer as { full_name?: string; phone?: string } | undefined

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/driver/dashboard')} className="text-taxi-muted hover:text-white">←</button>
        <h1 className="text-xl font-bold">Ride Controls</h1>
        <div className="ml-auto"><RideStatusBadge status={ride.status} /></div>
      </div>

      <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-4">
        <p className="text-xs uppercase tracking-wider text-taxi-muted mb-3">Customer</p>
        <div className="flex items-center justify-between">
          <p className="text-white font-semibold">{customer?.full_name ?? 'Customer'}</p>
          {customer?.phone && (
            <a href={`tel:${customer.phone}`} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              📞 Call
            </a>
          )}
        </div>
      </div>

      <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-6">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-taxi-yellow mt-0.5">●</span>
            <div>
              <p className="text-xs text-taxi-muted">Pickup</p>
              <p className="text-sm text-white">{ride.pickup_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-taxi-muted mt-0.5">→</span>
            <div>
              <p className="text-xs text-taxi-muted">Destination</p>
              <p className="text-sm text-white">{ride.destination_address}</p>
            </div>
          </div>
        </div>
        {ride.estimated_price && (
          <p className="text-taxi-yellow font-bold text-xl mt-3">~{formatPrice(ride.estimated_price, 'EUR')}</p>
        )}
        {ride.notes && <p className="text-taxi-muted text-sm mt-2">📝 {ride.notes}</p>}
      </div>

      {ride.pickup_lat && ride.pickup_lng && ride.status === 'assigned' && (
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${ride.pickup_lat},${ride.pickup_lng}`}
          target="_blank" rel="noreferrer"
          className="block w-full text-center bg-blue-600 text-white font-bold py-4 rounded-xl mb-4">
          🗺️ Navigate to Pickup
        </a>
      )}

      {ride.destination_lat && ride.destination_lng && ride.status === 'in_progress' && (
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${ride.destination_lat},${ride.destination_lng}`}
          target="_blank" rel="noreferrer"
          className="block w-full text-center bg-blue-600 text-white font-bold py-4 rounded-xl mb-4">
          🗺️ Navigate to Destination
        </a>
      )}

      {transition && (
        <button onClick={advanceStatus} disabled={advancing}
          className="w-full bg-taxi-yellow text-black font-bold py-5 rounded-xl text-lg disabled:opacity-50">
          {advancing ? 'Updating...' : transition.label}
        </button>
      )}
    </div>
  )
}
