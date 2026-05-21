'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RideStatusBadge } from './RideStatusBadge'
import { formatPrice } from '@/lib/pricing'
import type { Ride, Driver } from '@/lib/types'

interface DispatcherPanelProps {
  ride: Ride | null
  drivers: Driver[]
}

export function DispatcherPanel({ ride, drivers }: DispatcherPanelProps) {
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [assigning, setAssigning] = useState(false)

  async function assignDriver() {
    if (!ride || !selectedDriverId) return
    setAssigning(true)
    const supabase = createClient()
    await supabase.from('rides').update({
      driver_id: selectedDriverId,
      status: 'assigned',
      assigned_at: new Date().toISOString(),
    }).eq('id', ride.id)
    await supabase.from('drivers').update({ status: 'assigned' }).eq('id', selectedDriverId)
    setAssigning(false)
    setSelectedDriverId('')
  }

  if (!ride) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <p className="text-taxi-muted text-xs text-center">Select a ride from the queue</p>
      </div>
    )
  }

  const customer = ride.customer as { full_name?: string; phone?: string } | undefined

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
      {ride.estimated_price && (
        <div>
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-1">Fare</p>
          <p className="text-taxi-yellow font-bold text-lg">{formatPrice(ride.estimated_price, 'EUR')}</p>
          <p className="text-xs text-taxi-muted">Cash</p>
        </div>
      )}
      {ride.status === 'requested' && (
        <div>
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-2">Assign Driver</p>
          <select value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-taxi-border text-white text-xs rounded-lg px-2 py-2 mb-2 focus:outline-none focus:border-taxi-yellow">
            <option value="">Select driver...</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.profile?.full_name ?? 'Driver'} · {d.car_model}</option>
            ))}
          </select>
          <button onClick={assignDriver} disabled={!selectedDriverId || assigning}
            className="w-full bg-taxi-yellow text-black font-bold py-2 rounded-lg text-xs disabled:opacity-50">
            {assigning ? 'Assigning...' : 'Assign Ride'}
          </button>
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
