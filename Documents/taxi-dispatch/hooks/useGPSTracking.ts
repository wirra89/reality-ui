'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DriverStatus } from '@/lib/types'

export function getUpdateIntervalMs(status: DriverStatus | string): number {
  const intervals: Partial<Record<string, number>> = {
    on_trip:  3000,
    arriving: 5000,
    assigned: 10000,
  }
  return intervals[status] ?? 20000
}

interface GPSTrackingOptions {
  driverId: string
  driverStatus: DriverStatus
  enabled: boolean
}

export function useGPSTracking({ driverId, driverStatus, enabled }: GPSTrackingOptions) {
  const supabaseRef = useRef(createClient())
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
    const { error: updateError } = await supabaseRef.current.from('drivers').update({
      current_lat: lat,
      current_lng: lng,
      heading: heading ?? null,
      speed: speed ?? null,
      last_location_update: timestamp,
    }).eq('id', driverId)
    if (updateError) console.error('GPS location update failed:', updateError.message)

    // Insert historical record
    const { error: insertError } = await supabaseRef.current.from('driver_locations').insert({
      driver_id: driverId,
      lat,
      lng,
      heading: heading ?? null,
      speed: speed ?? null,
      accuracy: accuracy ?? null,
    })
    if (insertError) console.error('GPS location insert failed:', insertError.message)
  }, [driverId, driverStatus])

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
