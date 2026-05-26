'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { geocodeAddress, getDistanceKm } from '@/lib/mapbox'
import { estimateFare, formatPrice, getActiveFareSettings } from '@/lib/pricing'
import { useSettings } from '@/context/SettingsContext'
import type { GeocodingFeature } from '@/lib/mapbox'

interface CreateRideModalProps {
  onClose: () => void
  onCreated: () => void
}

export function CreateRideModal({ onClose, onCreated }: CreateRideModalProps) {
  const { settings, shifts } = useSettings()
  const [customerPhone, setCustomerPhone] = useState('')
  const [pickup, setPickup] = useState('')
  const [destination, setDestination] = useState('')
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [pickupSuggestions, setPickupSuggestions] = useState<GeocodingFeature[]>([])
  const [destSuggestions, setDestSuggestions] = useState<GeocodingFeature[]>([])
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!pickup) { setPickupSuggestions([]); return }
    const t = setTimeout(async () => {
      setPickupSuggestions(await geocodeAddress(pickup))
    }, 300)
    return () => clearTimeout(t)
  }, [pickup])

  useEffect(() => {
    if (!destination) { setDestSuggestions([]); return }
    const t = setTimeout(async () => {
      setDestSuggestions(await geocodeAddress(destination))
    }, 300)
    return () => clearTimeout(t)
  }, [destination])

  useEffect(() => {
    if (!pickupCoords || !destCoords) return
    getDistanceKm(pickupCoords, destCoords).then(setDistanceKm)
  }, [pickupCoords, destCoords])

  function selectPickup(f: GeocodingFeature) {
    setPickup(f.place_name)
    setPickupCoords({ lat: f.center[1], lng: f.center[0] })
    setPickupSuggestions([])
  }

  function selectDest(f: GeocodingFeature) {
    setDestination(f.place_name)
    setDestCoords({ lat: f.center[1], lng: f.center[0] })
    setDestSuggestions([])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!pickupCoords || !destCoords || !settings) return
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', customerPhone)
        .eq('role', 'customer')
        .maybeSingle()

      const fareSettings = getActiveFareSettings(shifts) ?? settings
      const estimated_price = distanceKm
        ? estimateFare(distanceKm, fareSettings)
        : fareSettings.minimum_fare

      const { error: rideError } = await supabase.from('rides').insert({
        customer_id: profiles?.id ?? null,
        pickup_address: pickup,
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        destination_address: destination,
        destination_lat: destCoords.lat,
        destination_lng: destCoords.lng,
        estimated_price,
        notes: notes || null,
        status: 'requested',
      })

      if (rideError) throw rideError

      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ride')
    } finally {
      setLoading(false)
    }
  }

  const fareSettings = getActiveFareSettings(shifts) ?? settings
  const fare = distanceKm && fareSettings ? estimateFare(distanceKm, fareSettings) : null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#151515] border border-taxi-border rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Create Ride</h2>
          <button onClick={onClose} className="text-taxi-muted hover:text-white text-xl">×</button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Customer Phone</label>
            <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
              placeholder="From phone call — optional"
              className="w-full bg-taxi-dark border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow text-sm" />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Pickup</label>
            <div className="relative">
              <input type="text" value={pickup} onChange={e => setPickup(e.target.value)} required
                placeholder="Enter pickup address"
                className="w-full bg-taxi-dark border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow text-sm" />
              {pickupSuggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-[#151515] border border-taxi-border rounded-lg overflow-hidden shadow-xl">
                  {pickupSuggestions.map(f => (
                    <li key={f.id} onClick={() => selectPickup(f)}
                      className="px-4 py-2.5 hover:bg-white/5 cursor-pointer text-sm text-white border-b border-taxi-border last:border-0">
                      {f.place_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Destination</label>
            <div className="relative">
              <input type="text" value={destination} onChange={e => setDestination(e.target.value)} required
                placeholder="Enter destination"
                className="w-full bg-taxi-dark border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow text-sm" />
              {destSuggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-[#151515] border border-taxi-border rounded-lg overflow-hidden shadow-xl">
                  {destSuggestions.map(f => (
                    <li key={f.id} onClick={() => selectDest(f)}
                      className="px-4 py-2.5 hover:bg-white/5 cursor-pointer text-sm text-white border-b border-taxi-border last:border-0">
                      {f.place_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Luggage, wheelchair access"
              className="w-full bg-taxi-dark border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow text-sm" />
          </div>

          {fare && settings && (
            <div className="bg-taxi-dark border border-taxi-border rounded-lg p-3">
              <p className="text-xs text-taxi-muted">Estimated fare</p>
              <p className="text-taxi-yellow font-bold text-xl">{formatPrice(fare, settings.currency)}</p>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border border-taxi-border text-taxi-muted py-3 rounded-xl text-sm hover:text-white transition">
              Cancel
            </button>
            <button type="submit" disabled={loading || !pickupCoords || !destCoords}
              className="flex-1 bg-taxi-yellow text-black font-bold py-3 rounded-xl text-sm disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Ride'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
