'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RideStatusBadge } from './RideStatusBadge'
import { formatPrice } from '@/lib/pricing'
import type { Ride, Driver } from '@/lib/types'

interface DispatcherPanelProps {
  ride: Ride | null
  drivers: Driver[]
  currency?: string
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function DispatcherPanel({ ride, drivers, currency = 'EUR' }: DispatcherPanelProps) {
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [fareOverride, setFareOverride] = useState('')

  async function assignDriver() {
    if (!ride || !selectedDriverId) return
    setAssigning(true)
    setAssignError('')
    try {
      const supabase = createClient()
      const updates: Record<string, unknown> = {
        driver_id: selectedDriverId,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
      }
      if (fareOverride && !isNaN(Number(fareOverride))) {
        updates.estimated_price = Number(fareOverride)
      }
      const { error: rideErr } = await supabase.from('rides').update(updates).eq('id', ride.id)
      if (rideErr) throw rideErr
      const { error: driverErr } = await supabase.from('drivers').update({ status: 'assigned' }).eq('id', selectedDriverId)
      if (driverErr) throw driverErr
      setSelectedDriverId('')
      setFareOverride('')
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : 'Assignment failed')
    } finally {
      setAssigning(false)
    }
  }

  if (!ride) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <p className="text-taxi-muted text-xs text-center">Select a ride from the queue</p>
      </div>
    )
  }

  const customer = ride.customer as { full_name?: string; phone?: string } | undefined

  // Sort available drivers by distance to pickup
  const driversWithDist = drivers
    .filter(d => ['online', 'waiting'].includes(d.status))
    .map(d => ({
      ...d,
      dist: ride.pickup_lat && ride.pickup_lng && d.current_lat && d.current_lng
        ? haversineKm(d.current_lat, d.current_lng, ride.pickup_lat, ride.pickup_lng)
        : null,
    }))
    .sort((a, b) => (a.dist ?? 9999) - (b.dist ?? 9999))

  const nearestDriver = driversWithDist[0]

  return (
    <div className="p-3 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-taxi-muted mb-2">Status</p>
        <RideStatusBadge status={ride.status} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-taxi-muted mb-2">Customer</p>
        <p className="text-sm text-white font-semibold">{customer?.full_name ?? '—'}</p>
        {customer?.phone && (
          <a href={`tel:${customer.phone}`} className="text-xs text-green-400 mt-1 block">{customer.phone}</a>
        )}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-taxi-muted mb-2">Route</p>
        <p className="text-xs text-white">📍 {ride.pickup_address}</p>
        <p className="text-xs text-taxi-muted mt-1">→ {ride.destination_address}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-taxi-muted mb-1">Fare</p>
        <div className="flex items-center gap-2">
          <p className="text-taxi-yellow font-bold text-lg">
            {fareOverride ? formatPrice(Number(fareOverride), currency) : ride.estimated_price ? formatPrice(ride.estimated_price, currency) : '—'}
          </p>
          {ride.status === 'requested' && (
            <input
              type="number"
              value={fareOverride}
              onChange={e => setFareOverride(e.target.value)}
              placeholder="Override"
              step="0.50"
              min="0"
              className="w-20 bg-[#1a1a1a] border border-taxi-border text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-taxi-yellow"
            />
          )}
        </div>
        <p className="text-xs text-taxi-muted">Cash</p>
      </div>
      {ride.status === 'requested' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs uppercase tracking-wider text-taxi-muted">Assign Driver</p>
            {nearestDriver && nearestDriver.dist != null && (
              <span className="text-xs text-green-400">nearest: {nearestDriver.dist.toFixed(1)} km</span>
            )}
          </div>
          <select value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-taxi-border text-white text-xs rounded-lg px-2 py-2 mb-2 focus:outline-none focus:border-taxi-yellow">
            <option value="">Select driver...</option>
            {driversWithDist.map(d => (
              <option key={d.id} value={d.id}>
                {d.id === nearestDriver?.id ? '★ ' : ''}{d.profile?.full_name ?? 'Driver'} · {d.car_model}
                {d.dist != null ? ` (${d.dist.toFixed(1)} km)` : ''}
              </option>
            ))}
          </select>
          <button onClick={assignDriver} disabled={!selectedDriverId || assigning}
            className="w-full bg-taxi-yellow text-black font-bold py-2 rounded-lg text-xs disabled:opacity-50">
            {assigning ? 'Assigning...' : 'Assign Ride'}
          </button>
          {assignError && <p className="text-red-400 text-xs mt-1">{assignError}</p>}
        </div>
      )}
      {customer?.phone && (
        <a href={`tel:${customer.phone}`}
          className="block w-full text-center border border-taxi-border text-taxi-muted py-2 rounded-lg text-xs hover:border-taxi-yellow hover:text-white transition">
          📞 Call Customer
        </a>
      )}
    </div>
  )
}
