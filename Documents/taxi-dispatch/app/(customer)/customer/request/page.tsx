'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { estimateFare, formatPrice } from '@/lib/pricing'
import { geocodeAddress, getDistanceKm, reverseGeocode } from '@/lib/mapbox'
import type { CompanySettings } from '@/lib/types'
import type { GeocodingFeature as MbFeature } from '@/lib/mapbox'

export default function RequestRidePage() {
  const router = useRouter()
  const [pickup, setPickup] = useState('')
  const [destination, setDestination] = useState('')
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [pickupSuggestions, setPickupSuggestions] = useState<MbFeature[]>([])
  const [destSuggestions, setDestSuggestions] = useState<MbFeature[]>([])
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('company_settings').select('*').single().then(({ data }) => setSettings(data))
  }, [])

  useEffect(() => {
    const t = setTimeout(async () => {
      setPickupSuggestions(await geocodeAddress(pickup))
    }, 300)
    return () => clearTimeout(t)
  }, [pickup])

  useEffect(() => {
    const t = setTimeout(async () => {
      setDestSuggestions(await geocodeAddress(destination))
    }, 300)
    return () => clearTimeout(t)
  }, [destination])

  useEffect(() => {
    if (!pickupCoords || !destCoords) return
    getDistanceKm(pickupCoords, destCoords).then(setDistanceKm)
  }, [pickupCoords, destCoords])

  async function useCurrentLocation() {
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      setPickupCoords({ lat, lng })
      const address = await reverseGeocode(lat, lng)
      setPickup(address)
      setPickupSuggestions([])
    })
  }

  function selectPickup(feature: MbFeature) {
    setPickup(feature.place_name)
    setPickupCoords({ lat: feature.center[1], lng: feature.center[0] })
    setPickupSuggestions([])
  }

  function selectDest(feature: MbFeature) {
    setDestination(feature.place_name)
    setDestCoords({ lat: feature.center[1], lng: feature.center[0] })
    setDestSuggestions([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pickupCoords || !destCoords || !settings) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const estimated_price = distanceKm
      ? estimateFare(distanceKm, settings)
      : settings.minimum_fare

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .insert({
        customer_id: user.id,
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
      .select()
      .single()

    if (rideError) {
      setError(rideError.message)
      setLoading(false)
      return
    }

    router.push(`/customer/ride/${ride.id}`)
  }

  const estimatedFare = distanceKm && settings ? estimateFare(distanceKm, settings) : null

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-taxi-muted hover:text-white">←</button>
        <h1 className="text-xl font-bold">Request a Ride</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Pickup</label>
          <div className="relative">
            <input
              type="text"
              value={pickup}
              onChange={e => setPickup(e.target.value)}
              required
              className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow pr-12"
              placeholder="Enter pickup address"
            />
            <button
              type="button"
              onClick={useCurrentLocation}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-taxi-muted hover:text-taxi-yellow text-sm"
              title="Use current location"
            >
              📍
            </button>
            {pickupSuggestions.length > 0 && (
              <ul className="absolute z-50 w-full mt-1 bg-taxi-card border border-taxi-border rounded-lg overflow-hidden shadow-xl">
                {pickupSuggestions.map(f => (
                  <li key={f.id} onClick={() => selectPickup(f)}
                    className="px-4 py-3 hover:bg-white/5 cursor-pointer text-sm text-white border-b border-taxi-border last:border-0">
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
            <input
              type="text"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              required
              className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
              placeholder="Enter destination"
            />
            {destSuggestions.length > 0 && (
              <ul className="absolute z-50 w-full mt-1 bg-taxi-card border border-taxi-border rounded-lg overflow-hidden shadow-xl">
                {destSuggestions.map(f => (
                  <li key={f.id} onClick={() => selectDest(f)}
                    className="px-4 py-3 hover:bg-white/5 cursor-pointer text-sm text-white border-b border-taxi-border last:border-0">
                    {f.place_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Notes (optional)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
            placeholder="e.g. Ring the bell, call on arrival" />
        </div>

        {estimatedFare && settings && (
          <div className="bg-taxi-card border border-taxi-border rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-taxi-muted mb-1">Estimated Fare</p>
            <p className="text-3xl font-bold text-taxi-yellow">{formatPrice(estimatedFare, settings.currency)}</p>
            {distanceKm && (
              <p className="text-sm text-taxi-muted mt-1">{distanceKm.toFixed(1)} km · Cash payment</p>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit" disabled={loading || !pickupCoords || !destCoords}
          className="w-full bg-taxi-yellow text-black font-bold py-4 rounded-xl text-lg hover:bg-yellow-400 transition disabled:opacity-50">
          {loading ? 'Requesting...' : 'Request Taxi'}
        </button>
      </form>
    </div>
  )
}
