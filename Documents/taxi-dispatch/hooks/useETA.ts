'use client'

import { useState, useEffect, useRef } from 'react'

interface Coords {
  lat: number
  lng: number
}

/** Returns estimated duration in seconds, or null while loading / on error. */
export function useETA(from: Coords | null, to: Coords | null): number | null {
  const [seconds, setSeconds] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!from || !to) {
      setSeconds(null)
      return
    }

    const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!TOKEN) return

    async function fetchETA() {
      if (!from || !to) return
      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?access_token=${TOKEN}&overview=false`
        )
        if (!res.ok) return
        const data = await res.json()
        const duration: number | undefined = data.routes?.[0]?.duration
        if (typeof duration === 'number') setSeconds(Math.round(duration))
      } catch {
        // silently ignore — stale value stays displayed
      }
    }

    fetchETA()
    timerRef.current = setInterval(fetchETA, 30_000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [from?.lat, from?.lng, to?.lat, to?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  return seconds
}

/** Format seconds into "X min" or "< 1 min". */
export function formatETA(seconds: number): string {
  const mins = Math.round(seconds / 60)
  if (mins < 1) return '< 1 min'
  return `${mins} min`
}
