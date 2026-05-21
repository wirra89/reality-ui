'use client'

import { useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { createDriverMarker, updateDriverMarker } from '@/components/DriverMarker'
import type { Driver } from '@/lib/types'

export function useDispatcherMap() {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())

  const handleMapReady = useCallback((map: mapboxgl.Map) => {
    mapRef.current = map
  }, [])

  const syncDriverMarkers = useCallback((drivers: Driver[]) => {
    const map = mapRef.current
    if (!map) return

    const seen = new Set<string>()

    for (const driver of drivers) {
      seen.add(driver.id)
      const existing = markersRef.current.get(driver.id)

      if (existing) {
        updateDriverMarker(existing, driver)
      } else if (driver.current_lat && driver.current_lng) {
        const marker = createDriverMarker(driver, map)
        if (marker) markersRef.current.set(driver.id, marker)
      }
    }

    // Remove markers for drivers no longer online
    for (const [id, marker] of markersRef.current.entries()) {
      if (!seen.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    }
  }, [])

  const addPickupMarker = useCallback((lat: number, lng: number, label: string) => {
    if (!mapRef.current) return null
    const el = document.createElement('div')
    el.style.cssText = 'width:20px;height:20px;background:#FFD700;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.5);'
    el.title = label
    return new mapboxgl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(mapRef.current)
  }, [])

  return { handleMapReady, syncDriverMarkers, addPickupMarker, mapRef }
}
