'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface LatLng { lat: number; lng: number }

interface MapViewProps {
  center?: LatLng
  zoom?: number
  className?: string
  onMapReady?: (map: mapboxgl.Map) => void
}

export function MapView({ center, zoom = 13, className = '', onMapReady }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
    const defaultCenter = center ?? { lat: 44.8176, lng: 20.4633 } // Belgrade default

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [defaultCenter.lng, defaultCenter.lat],
      zoom,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      mapRef.current = map
      onMapReady?.(map)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pan to new center when prop changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.panTo([center.lng, center.lat])
    }
  }, [center?.lat, center?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className={`w-full h-full ${className}`} />
}
