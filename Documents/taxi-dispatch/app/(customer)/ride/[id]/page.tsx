'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import mapboxgl from 'mapbox-gl'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/useRealtime'
import { useDriverLocation } from '@/hooks/useDriverLocation'
import { RideStatusBadge } from '@/components/RideStatusBadge'
import { ActiveRideTimeline } from '@/components/ActiveRideTimeline'
import { MapView } from '@/components/MapView'
import { formatPrice } from '@/lib/pricing'
import type { Ride } from '@/lib/types'

export default function CustomerRidePage() {
  const params = useParams()
  const router = useRouter()
  const rideId = params.id as string
  const [ride, setRide] = useState<Ride | null>(null)
  const [loading, setLoading] = useState(true)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null)

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

  const driverLocation = useDriverLocation(
    (ride?.status !== 'requested' && ride?.driver_id) ? ride.driver_id : null
  )

  // Update driver marker when location changes
  useEffect(() => {
    if (!mapRef.current || !driverLocation?.current_lat || !driverLocation?.current_lng) return
    const lngLat: [number, number] = [driverLocation.current_lng, driverLocation.current_lat]

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat(lngLat)
    } else {
      const el = document.createElement('div')
      el.style.cssText = 'width:32px;height:32px;background:#FFD700;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:16px;'
      el.title = 'Your Driver'
      el.textContent = '🚕'
      driverMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(mapRef.current)
    }

    mapRef.current.panTo(lngLat)
  }, [driverLocation?.current_lat, driverLocation?.current_lng])

  function handleMapReady(map: mapboxgl.Map) {
    mapRef.current = map
    if (ride?.pickup_lat && ride?.pickup_lng) {
      const el = document.createElement('div')
      el.style.cssText = 'width:16px;height:16px;background:#4ade80;border:2px solid #fff;border-radius:50%;'
      el.title = 'Pickup'
      pickupMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([ride.pickup_lng, ride.pickup_lat])
        .addTo(map)
    }
  }

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
  const showMap = ride.status !== 'requested' && ride.status !== 'cancelled'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Live map */}
      {showMap && (
        <div className="h-56 w-full">
          <MapView
            onMapReady={handleMapReady}
            center={ride.pickup_lat && ride.pickup_lng
              ? { lat: ride.pickup_lat, lng: ride.pickup_lng }
              : undefined}
            className="w-full h-full"
          />
        </div>
      )}

      <div className="flex-1 p-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/customer/dashboard')} className="text-taxi-muted hover:text-white">←</button>
          <h1 className="text-xl font-bold">Your Ride</h1>
          <div className="ml-auto">
            <RideStatusBadge status={ride.status} />
          </div>
        </div>

        {/* Route */}
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
            <p className="text-taxi-yellow font-bold text-xl mt-3">
              ~{formatPrice(ride.estimated_price, 'EUR')}
            </p>
          )}
        </div>

        {/* Driver info */}
        {driver && (
          <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-4">
            <p className="text-xs uppercase tracking-wider text-taxi-muted mb-3">Your Driver</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{driver.profile?.full_name ?? 'Driver'}</p>
                <p className="text-taxi-muted text-sm">{(driver as { car_model?: string }).car_model} · {(driver as { car_plate?: string }).car_plate}</p>
              </div>
              {driver.profile?.phone && (
                <a
                  href={`tel:${driver.profile.phone}`}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  📞 Call
                </a>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-4">Progress</p>
          <ActiveRideTimeline currentStatus={ride.status} />
        </div>

        {ride.status === 'requested' && (
          <button
            onClick={handleCancel}
            className="w-full border border-red-800 text-red-400 py-3 rounded-xl text-sm hover:bg-red-900/20 transition"
          >
            Cancel Ride
          </button>
        )}

        {(ride.status === 'completed' || ride.status === 'cancelled') && (
          <button
            onClick={() => router.push('/customer/dashboard')}
            className="w-full bg-taxi-yellow text-black font-bold py-4 rounded-xl"
          >
            Back to Home
          </button>
        )}
      </div>
    </div>
  )
}
