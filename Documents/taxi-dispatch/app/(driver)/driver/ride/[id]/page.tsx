'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/useRealtime'
import { RideStatusBadge } from '@/components/RideStatusBadge'
import { NavigateButton } from '@/components/NavigateButton'
import { DRIVER_TRANSITIONS } from '@/lib/ride-status'
import { formatPrice, calculateWaitCharge } from '@/lib/pricing'
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
  const [currency, setCurrency] = useState('EUR')
  const [waitChargePerMin, setWaitChargePerMin] = useState(0.10)
  const [waitSeconds, setWaitSeconds] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('company_settings').select('currency,wait_charge_per_min').limit(1).single().then(({ data: s }) => {
      if (s?.currency) setCurrency(s.currency)
      if (s?.wait_charge_per_min != null) setWaitChargePerMin(s.wait_charge_per_min)
    })
    async function load() {
      const [{ data: rideData }, { data: { user } }] = await Promise.all([
        supabase.from('rides').select('*, customer:profiles!customer_id(*)').eq('id', rideId).single(),
        supabase.auth.getUser(),
      ])
      setRide(rideData as Ride | null)
      if (user) {
        const { data: driverData } = await supabase.from('drivers').select('*').eq('user_id', user.id).single()
        setDriverRecord(driverData as Driver | null)
      }
      setLoading(false)
    }
    load()
  }, [rideId])

  useRealtime({
    table: 'rides',
    filter: `id=eq.${rideId}`,
    onUpdate: (payload) => setRide(prev => prev ? { ...prev, ...payload.new as Ride } : null),
  })

  // Wait timer — counts up while driver is at pickup
  useEffect(() => {
    if (ride?.status !== 'arrived') { setWaitSeconds(0); return }
    const base = ride.arrived_at ? new Date(ride.arrived_at).getTime() : Date.now()
    const tick = () => setWaitSeconds(Math.floor((Date.now() - base) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [ride?.status, ride?.arrived_at])

  async function advanceStatus() {
    if (!ride || !driverRecord) return
    const transition = DRIVER_TRANSITIONS[ride.status]
    if (!transition) return

    setAdvancing(true)
    const supabase = createClient()
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { status: transition.next }

    if (transition.next === 'arrived')    updates.arrived_at   = now
    if (transition.next === 'in_progress') updates.started_at = now
    if (transition.next === 'completed') {
      updates.completed_at = now
      const waitCharge = calculateWaitCharge(ride.arrived_at, ride.started_at, waitChargePerMin)
      updates.final_price = (ride.estimated_price ?? 0) + waitCharge
    }

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
          <p className="text-taxi-yellow font-bold text-xl mt-3">~{formatPrice(ride.estimated_price, currency)}</p>
        )}
        {ride.notes && <p className="text-taxi-muted text-sm mt-2">📝 {ride.notes}</p>}
      </div>

      {/* Navigate to pickup — show while driver is heading there or waiting */}
      {ride.pickup_lat != null && ride.pickup_lng != null &&
        (ride.status === 'assigned' || ride.status === 'driver_arriving' || ride.status === 'arrived') && (
        <div className="mb-4">
          <NavigateButton lat={ride.pickup_lat} lng={ride.pickup_lng} label="Navigate to Pickup" />
        </div>
      )}

      {/* Navigate to destination — show once ride is in progress */}
      {ride.destination_lat != null && ride.destination_lng != null && ride.status === 'in_progress' && (
        <div className="mb-4">
          <NavigateButton lat={ride.destination_lat} lng={ride.destination_lng} label="Navigate to Destination" />
        </div>
      )}

      {ride.status === 'arrived' && (
        <div className={`border rounded-xl p-4 mb-4 ${waitSeconds > 120 ? 'bg-amber-950/40 border-amber-700' : 'bg-taxi-card border-taxi-border'}`}>
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-1">Waiting at pickup</p>
          <p className={`text-2xl font-bold font-mono ${waitSeconds > 120 ? 'text-amber-300' : 'text-white'}`}>
            {String(Math.floor(waitSeconds / 60)).padStart(2, '0')}:{String(waitSeconds % 60).padStart(2, '0')}
          </p>
          {waitSeconds > 120 && (
            <p className="text-xs text-amber-400 mt-1">
              +{formatPrice(Math.floor(waitSeconds / 60) * waitChargePerMin, currency)} wait charge
            </p>
          )}
        </div>
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
