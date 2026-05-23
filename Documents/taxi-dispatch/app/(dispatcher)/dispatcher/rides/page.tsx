'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/useRealtime'
import { RideStatusBadge } from '@/components/RideStatusBadge'
import { ETABadge } from '@/components/ETABadge'
import { useETA } from '@/hooks/useETA'
import { formatPrice } from '@/lib/pricing'
import type { Ride } from '@/lib/types'

type RideWithDriverLocation = Omit<Ride, 'driver'> & {
  driver?: {
    car_model?: string | null
    car_plate?: string | null
    current_lat?: number | null
    current_lng?: number | null
    profile?: { full_name?: string | null }
  }
}

type AvailableDriver = { id: string; car_model?: string | null; profile?: { full_name?: string | null } }

const ETA_STATUSES = new Set(['assigned', 'driver_arriving'])

function RideETA({ ride }: { ride: RideWithDriverLocation }) {
  const driver = ride.driver
  const showETA = ETA_STATUSES.has(ride.status)
  const etaSeconds = useETA(
    showETA && driver?.current_lat != null && driver?.current_lng != null
      ? { lat: driver.current_lat, lng: driver.current_lng } : null,
    showETA && ride.pickup_lat != null && ride.pickup_lng != null
      ? { lat: ride.pickup_lat, lng: ride.pickup_lng } : null
  )
  return <ETABadge seconds={etaSeconds} />
}

export default function DispatcherRidesPage() {
  const router = useRouter()
  const [rides, setRides] = useState<RideWithDriverLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [currency, setCurrency] = useState('EUR')
  const [availableDrivers, setAvailableDrivers] = useState<AvailableDriver[]>([])
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [selectedDriver, setSelectedDriver] = useState('')
  const [assigning, setAssigning] = useState(false)
  const filterRef = useRef(filter)
  useEffect(() => { filterRef.current = filter }, [filter])

  const handleRideUpdate = useCallback((updated: Ride) => {
    setRides(prev => {
      const currentFilter = filterRef.current
      const matches = currentFilter === 'all' || updated.status === currentFilter
      const idx = prev.findIndex(r => r.id === updated.id)
      if (idx >= 0) {
        if (!matches) return prev.filter(r => r.id !== updated.id)
        return prev.map(r => r.id === updated.id ? { ...r, ...updated } : r)
      }
      return matches ? [updated as RideWithDriverLocation, ...prev] : prev
    })
  }, [])

  useRealtime({
    table: 'rides',
    onInsert: (p) => handleRideUpdate(p.new as Ride),
    onUpdate: (p) => handleRideUpdate(p.new as Ride),
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('company_settings').select('currency').limit(1).single().then(({ data: s }) => {
      if (s?.currency) setCurrency(s.currency)
    })
    supabase.from('drivers').select('id, car_model, profile:profiles(full_name)')
      .in('status', ['online', 'waiting'])
      .then(({ data }) => setAvailableDrivers((data ?? []) as AvailableDriver[]))
  }, [])

  useEffect(() => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('rides')
      .select('*, customer:profiles!customer_id(full_name, phone), driver:drivers(car_model, car_plate, current_lat, current_lng, profile:profiles(full_name))')
      .order('requested_at', { ascending: false })
      .limit(100)
    if (filter !== 'all') query = query.eq('status', filter)
    query.then(({ data }) => {
      setRides((data ?? []) as RideWithDriverLocation[])
      setLoading(false)
    })
  }, [filter])

  async function doAssign(rideId: string) {
    if (!selectedDriver) return
    setAssigning(true)
    const supabase = createClient()
    await supabase.from('rides').update({ driver_id: selectedDriver, status: 'assigned', assigned_at: new Date().toISOString() }).eq('id', rideId)
    await supabase.from('drivers').update({ status: 'assigned' }).eq('id', selectedDriver)
    setRides(prev => prev.map(r => r.id === rideId ? { ...r, status: 'assigned' as const } : r))
    setAssigningId(null)
    setSelectedDriver('')
    setAssigning(false)
  }

  const FILTERS = ['all', 'requested', 'assigned', 'in_progress', 'completed', 'cancelled']

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/dispatcher/dashboard')} className="text-taxi-muted hover:text-white">←</button>
        <h1 className="text-2xl font-bold">All Rides</h1>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition capitalize ${
              filter === f ? 'bg-taxi-yellow text-black' : 'bg-taxi-card border border-taxi-border text-taxi-muted hover:text-white'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading && <p className="text-taxi-muted">Loading...</p>}

      <div className="space-y-2">
        {rides.map(ride => {
          const customer = ride.customer as { full_name?: string; phone?: string } | undefined
          const driver = ride.driver
          return (
            <div key={ride.id} className="bg-taxi-card border border-taxi-border rounded-xl p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <RideStatusBadge status={ride.status} />
                    <RideETA ride={ride} />
                    <span className="text-taxi-muted text-xs">{new Date(ride.requested_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-white truncate">📍 {ride.pickup_address}</p>
                  <p className="text-sm text-taxi-muted truncate">→ {ride.destination_address}</p>
                  <div className="flex gap-4 mt-2 text-xs text-taxi-muted">
                    {customer?.full_name && <span>Customer: {customer.full_name}</span>}
                    {driver?.profile?.full_name && <span>Driver: {driver.profile.full_name}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {ride.estimated_price && (
                    <p className="text-taxi-yellow font-bold">{formatPrice(ride.estimated_price, currency)}</p>
                  )}
                  {ride.status === 'requested' && availableDrivers.length > 0 && (
                    <button onClick={() => { setAssigningId(ride.id); setSelectedDriver('') }}
                      className="text-xs bg-taxi-yellow text-black font-bold px-3 py-1 rounded-lg hover:bg-yellow-400 transition">
                      + Assign
                    </button>
                  )}
                </div>
              </div>

              {assigningId === ride.id && (
                <div className="mt-3 pt-3 border-t border-taxi-border flex gap-2">
                  <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}
                    className="flex-1 bg-[#1a1a1a] border border-taxi-border text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-taxi-yellow">
                    <option value="">Select driver...</option>
                    {availableDrivers.map(d => (
                      <option key={d.id} value={d.id}>{d.profile?.full_name ?? 'Driver'} · {d.car_model}</option>
                    ))}
                  </select>
                  <button onClick={() => doAssign(ride.id)} disabled={!selectedDriver || assigning}
                    className="bg-taxi-yellow text-black font-bold px-4 py-2 rounded-lg text-xs disabled:opacity-50">
                    {assigning ? '...' : 'Assign'}
                  </button>
                  <button onClick={() => setAssigningId(null)}
                    className="border border-taxi-border text-taxi-muted px-3 py-2 rounded-lg text-xs hover:text-white">
                    ✕
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
