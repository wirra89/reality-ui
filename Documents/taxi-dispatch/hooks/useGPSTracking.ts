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
  onError?: (message: string) => void
}

export function useGPSTracking({ driverId, driverStatus, enabled, onError }: GPSTrackingOptions) {
  const supabaseRef = useRef(createClient())
  const lastSentAt = useRef<number>(0)
  const watchIdRef = useRef<number | null>(null)
  const retryCountRef = useRef<number>(0)

  const sendLocation = useCallback(async (position: GeolocationPosition) => {
    const interval = getUpdateIntervalMs(driverStatus)
    const now = Date.now()
    if (now - lastSentAt.current < interval) return
    lastSentAt.current = now

    const { latitude: lat, longitude: lng, heading, speed, accuracy } = position.coords
    const timestamp = new Date().toISOString()

    const { error: updateError } = await supabaseRef.current.from('drivers').update({
      current_lat: lat,
      current_lng: lng,
      heading: heading ?? null,
      speed: speed ?? null,
      last_location_update: timestamp,
    }).eq('id', driverId)

    if (updateError) {
      retryCountRef.current++
      console.error('GPS location update failed:', updateError.message)
      // After 3 consecutive failures, surface a warning
      if (retryCountRef.current === 3) onError?.('GPS sync issues — check your connection.')
      return
    }
    retryCountRef.current = 0

    await supabaseRef.current.from('driver_locations').insert({
      driver_id: driverId,
      lat,
      lng,
      heading: heading ?? null,
      speed: speed ?? null,
      accuracy: accuracy ?? null,
    })
  }, [driverId, driverStatus, onError])

  useEffect(() => {
    if (!enabled) return
    if (!navigator.geolocation) {
      onError?.('Geolocation is not supported by your browser.')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      (err) => {
        const messages: Record<number, string> = {
          1: 'Location access denied — GPS tracking disabled.',
          2: 'Location unavailable.',
          3: 'GPS request timed out.',
        }
        const msg = messages[err.code] ?? 'GPS error.'
        console.error('GPS watch error:', msg)
        onError?.(msg)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [enabled, sendLocation, onError])
}
