'use client'

import { useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { createDriverMarker, updateDriverMarker } from '@/components/DriverMarker'
import type { Driver } from '@/lib/types'

export function useDispatcherMap() {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const latestDriversRef = useRef<Driver[]>([])
  const followDriverIdRef = useRef<string | null>(null)

  const doSync = useCallback((map: mapboxgl.Map, drivers: Driver[]) => {
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

      // Pan map if this is the followed driver and their position updated
      if (
        driver.id === followDriverIdRef.current &&
        driver.current_lat && driver.current_lng
      ) {
        map.easeTo({ center: [driver.current_lng, driver.current_lat], duration: 800 })
      }
    }

    for (const [id, marker] of markersRef.current.entries()) {
      if (!seen.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    }
  }, [])

  const handleMapReady = useCallback((map: mapboxgl.Map) => {
    mapRef.current = map
    // Sync any drivers that arrived before the map was ready
    doSync(map, latestDriversRef.current)
  }, [doSync])

  const syncDriverMarkers = useCallback((drivers: Driver[]) => {
    latestDriversRef.current = drivers
    const map = mapRef.current
    if (!map) return // map not ready yet — handleMapReady will sync when it fires
    doSync(map, drivers)
  }, [doSync])

  const setFollowedDriver = useCallback((driverId: string | null) => {
    followDriverIdRef.current = driverId
    if (!driverId || !mapRef.current) return
    const driver = latestDriversRef.current.find(d => d.id === driverId)
    if (driver?.current_lat && driver?.current_lng) {
      mapRef.current.easeTo({
        center: [driver.current_lng, driver.current_lat],
        zoom: Math.max(mapRef.current.getZoom(), 14),
        duration: 800,
      })
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

  return { handleMapReady, syncDriverMarkers, setFollowedDriver, addPickupMarker, mapRef }
}
