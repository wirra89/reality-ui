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
  const [showReassign, setShowReassign] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)

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

  async function reassignDriver() {
    if (!ride || !selectedDriverId) return
    setAssigning(true)
    setAssignError('')
    try {
      const supabase = createClient()
      if (ride.driver_id) {
        await supabase.from('drivers').update({ status: 'online' }).eq('id', ride.driver_id)
      }
      const { error: rideErr } = await supabase.from('rides').update({
        driver_id: selectedDriverId,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
      }).eq('id', ride.id)
      if (rideErr) throw rideErr
      const { error: driverErr } = await supabase.from('drivers').update({ status: 'assigned' }).eq('id', selectedDriverId)
      if (driverErr) throw driverErr
      setShowReassign(false)
      setSelectedDriverId('')
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : 'Reassign failed')
    } finally {
      setAssigning(false)
    }
  }

  async function cancelRide() {
    if (!ride) return
    setCancelling(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('rides').update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'dispatcher_cancelled',
      }).eq('id', ride.id)
      if (error) throw error
      if (ride.driver_id) {
        await supabase.from('drivers').update({ status: 'online' }).eq('id', ride.driver_id)
      }
      setShowCancelConfirm(false)
    } catch (err) {
      console.error('Cancel ride failed:', err)
    } finally {
      setCancelling(false)
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

  const canCancel = ['requested', 'assigned', 'driver_arriving', 'arrived'].includes(ride.status)
  const canReassign = ['assigned', 'driver_arriving'].includes(ride.status)

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
      {/* Reassign — for in-flight rides */}
      {canReassign && (
        <div>
          {!showReassign ? (
            <button onClick={() => { setShowReassign(true); setSelectedDriverId('') }}
              className="w-full border border-taxi-border text-taxi-muted py-2 rounded-lg text-xs hover:border-taxi-yellow hover:text-white transition">
              ↺ Reassign Driver
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-taxi-muted">Reassign to</p>
              <select value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-taxi-border text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-taxi-yellow">
                <option value="">Select driver...</option>
                {driversWithDist.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.id === nearestDriver?.id ? '★ ' : ''}{d.profile?.full_name ?? 'Driver'} · {d.car_model}
                    {d.dist != null ? ` (${d.dist.toFixed(1)} km)` : ''}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={reassignDriver} disabled={!selectedDriverId || assigning}
                  className="flex-1 bg-taxi-yellow text-black font-bold py-2 rounded-lg text-xs disabled:opacity-50">
                  {assigning ? '...' : 'Reassign'}
                </button>
                <button onClick={() => { setShowReassign(false); setSelectedDriverId('') }}
                  className="border border-taxi-border text-taxi-muted px-3 py-2 rounded-lg text-xs hover:text-white">
                  ✕
                </button>
              </div>
              {assignError && <p className="text-red-400 text-xs">{assignError}</p>}
            </div>
          )}
        </div>
      )}
      {/* Cancel */}
      {canCancel && (
        <div>
          {!showCancelConfirm ? (
            <button onClick={() => setShowCancelConfirm(true)}
              className="w-full border border-red-900 text-red-500 py-2 rounded-lg text-xs hover:bg-red-950/40 transition">
              ✕ Cancel Ride
            </button>
          ) : (
            <div className="border border-red-900 rounded-lg p-3 space-y-2 bg-red-950/20">
              <p className="text-xs text-red-400 font-semibold">Cancel this ride?</p>
              <div className="flex gap-2">
                <button onClick={cancelRide} disabled={cancelling}
                  className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg text-xs disabled:opacity-50">
                  {cancelling ? '...' : 'Yes, cancel'}
                </button>
                <button onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 border border-taxi-border text-taxi-muted py-2 rounded-lg text-xs hover:text-white">
                  No
                </button>
              </div>
            </div>
          )}
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
