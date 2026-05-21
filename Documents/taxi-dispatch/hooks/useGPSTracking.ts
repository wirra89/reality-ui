'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DriverStatus } from '@/lib/types'

export function getUpdateIntervalMs(status: DriverStatus | string): number {
  const intervals: Partial<Record<DriverStatus, number>> = {
    on_trip:  3000,
    arriving: 5000,
    assigned: 10000,
  }
  return intervals[status as DriverStatus] ?? 20000
}

interface GPSTrackingOptions {
  driverId: string
  driverStatus: DriverStatus
  enabled: boolean
}

export function useGPSTracking({ driverId, driverStatus, enabled }: GPSTrackingOptions) {
  const supabase = createClient()
  const lastSentAt = useRef<number>(0)
  const watchIdRef = useRef<number | null>(null)

  const sendLocation = useCallback(async (position: GeolocationPosition) => {
    const interval = getUpdateIntervalMs(driverStatus)
    const now = Date.now()
    if (now - lastSentAt.current < interval) return
    lastSentAt.current = now

    const { latitude: lat, longitude: lng, heading, speed, accuracy } = position.coords
    const timestamp = new Date().toISOString()

    // Update current position on drivers table
    await supabase.from('drivers').update({
      current_lat: lat,
      current_lng: lng,
      heading: heading ?? null,
      speed: speed ?? null,
      last_location_update: timestamp,
    }).eq('id', driverId)

    // Insert historical record
    await supabase.from('driver_locations').insert({
      driver_id: driverId,
      lat,
      lng,
      heading: heading ?? null,
      speed: speed ?? null,
      accuracy: accuracy ?? null,
    })
  }, [driverId, driverStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      (err) => console.error('GPS error:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [enabled, sendLocation])
}
