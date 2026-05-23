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
import { DriverInfoCard } from '@/components/DriverInfoCard'
import { ETABadge } from '@/components/ETABadge'
import { StarRating } from '@/components/StarRating'
import { CancelRideModal } from '@/components/CancelRideModal'
import { useETA } from '@/hooks/useETA'
import { formatPrice } from '@/lib/pricing'
import type { Ride } from '@/lib/types'

export default function CustomerRidePage() {
  const params = useParams()
  const router = useRouter()
  const rideId = params.id as string
  const [ride, setRide] = useState<Ride | null>(null)
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('EUR')
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingNote, setRatingNote] = useState('')
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [ratingSubmitting, setRatingSubmitting] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('company_settings').select('currency').limit(1).single().then(({ data: s }) => {
      if (s?.currency) setCurrency(s.currency)
    })
    supabase
      .from('rides')
      .select('*, driver:drivers(*, profile:profiles(*))')
      .eq('id', rideId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setRide(data as Ride)
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

  // ETA: driver's current position → pickup (while driver is en-route)
  const showETA = ride?.status === 'assigned' || ride?.status === 'driver_arriving'
  const etaSeconds = useETA(
    showETA && driverLocation?.current_lat != null && driverLocation?.current_lng != null
      ? { lat: driverLocation.current_lat, lng: driverLocation.current_lng }
      : null,
    showETA && ride?.pickup_lat != null && ride?.pickup_lng != null
      ? { lat: ride.pickup_lat, lng: ride.pickup_lng }
      : null
  )

  // Update driver marker when location changes or map becomes ready
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

    mapRef.current.easeTo({ center: lngLat, duration: 800 })
  }, [driverLocation?.current_lat, driverLocation?.current_lng, mapReady]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleMapReady(map: mapboxgl.Map) {
    mapRef.current = map
    setMapReady(true)
  }

  // Place pickup marker once both map and ride data are available
  useEffect(() => {
    if (!mapRef.current || !ride?.pickup_lat || !ride?.pickup_lng) return
    if (pickupMarkerRef.current) return // already placed

    const el = document.createElement('div')
    el.style.cssText = 'width:16px;height:16px;background:#4ade80;border:2px solid #fff;border-radius:50%;'
    el.title = 'Pickup'
    pickupMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([ride.pickup_lng, ride.pickup_lat])
      .addTo(mapRef.current)
  }, [ride?.pickup_lat, ride?.pickup_lng, mapReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up markers on unmount
  useEffect(() => {
    return () => {
      driverMarkerRef.current?.remove()
      pickupMarkerRef.current?.remove()
    }
  }, [])

  async function handleCancel(reason: string) {
    if (!ride) return
    setCancelling(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('rides')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancellation_reason: reason })
        .eq('id', ride.id)
      if (error) throw error
      setShowCancelModal(false)
    } catch (err) {
      console.error('Cancel ride failed:', err)
    }
    setCancelling(false)
  }

  async function submitRating() {
    if (!ride || ratingValue < 1) return
    setRatingSubmitting(true)
    const supabase = createClient()
    await supabase
      .from('rides')
      .update({ customer_rating: ratingValue, rating_note: ratingNote || null })
      .eq('id', ride.id)
    setRide(prev => prev ? { ...prev, customer_rating: ratingValue, rating_note: ratingNote || null } : null)
    setRatingSubmitted(true)
    setRatingSubmitting(false)
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

  const driver = ride.driver
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
          <div className="ml-auto flex items-center gap-2">
            <ETABadge seconds={etaSeconds} />
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
          {ride.scheduled_at && (
            <p className="text-blue-300 text-sm mt-2">
              Scheduled for{' '}
              {new Date(ride.scheduled_at).toLocaleString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
          {ride.estimated_price && (
            <p className="text-taxi-yellow font-bold text-xl mt-3">
              ~{formatPrice(ride.estimated_price, currency)}
            </p>
          )}
        </div>

        {/* Driver info */}
        {driver && <DriverInfoCard driver={driver} />}

        {/* Timeline */}
        <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-4">Progress</p>
          <ActiveRideTimeline currentStatus={ride.status} />
        </div>

        {ride.status === 'requested' && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full border border-red-800 text-red-400 py-3 rounded-xl text-sm hover:bg-red-900/20 transition"
          >
            Cancel Ride
          </button>
        )}

        {/* Rating prompt — only for completed rides not yet rated */}
        {ride.status === 'completed' && !ride.customer_rating && !ratingSubmitted && (
          <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-white mb-3">How was your ride?</p>
            <div className="flex justify-center mb-3">
              <StarRating value={ratingValue} onChange={setRatingValue} size="lg" />
            </div>
            <textarea
              value={ratingNote}
              onChange={e => setRatingNote(e.target.value)}
              placeholder="Optional comment…"
              rows={2}
              className="w-full bg-[#111] border border-taxi-border rounded-lg px-3 py-2 text-sm text-white placeholder-taxi-muted resize-none focus:outline-none focus:border-taxi-yellow mb-3"
            />
            <button
              onClick={submitRating}
              disabled={ratingValue < 1 || ratingSubmitting}
              className="w-full bg-taxi-yellow text-black font-bold py-3 rounded-xl disabled:opacity-40 transition-opacity"
            >
              {ratingSubmitting ? 'Submitting…' : 'Submit Rating'}
            </button>
          </div>
        )}

        {ride.status === 'completed' && (ride.customer_rating || ratingSubmitted) && (
          <div className="flex items-center justify-center gap-2 mb-4 text-sm text-taxi-muted">
            <StarRating value={ride.customer_rating ?? ratingValue} readonly size="sm" />
            <span>Rating saved</span>
          </div>
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

      {showCancelModal && (
        <CancelRideModal
          onConfirm={handleCancel}
          onClose={() => setShowCancelModal(false)}
          submitting={cancelling}
        />
      )}
    </div>
  )
}
