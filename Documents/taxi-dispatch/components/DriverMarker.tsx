// Not a React component — a factory that creates/updates Mapbox GL markers

import mapboxgl from 'mapbox-gl'
import type { Driver, DriverStatus } from '@/lib/types'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const STATUS_COLORS: Record<DriverStatus, string> = {
  offline:  '#9ca3af',
  online:   '#4ade80',
  assigned: '#facc15',
  arriving: '#60a5fa',
  waiting:  '#a78bfa',
  on_trip:  '#34d399',
}

function createMarkerElement(driver: Driver): HTMLElement {
  const color = STATUS_COLORS[driver.status]
  const name = driver.profile?.full_name ?? 'Driver'
  const safeName = escapeHtml(name.split(' ')[0])
  const el = document.createElement('div')
  el.style.cssText = 'position:relative;width:32px;height:50px;'
  el.innerHTML = `
    <div style="background:${color};border:2px solid #fff;border-radius:50%;
      width:32px;height:32px;display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);cursor:pointer;">
      <span style="color:#000;font-size:10px;font-weight:bold;">${safeName.charAt(0)}</span>
    </div>
    <div style="position:absolute;top:36px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.8);color:#fff;font-size:9px;padding:2px 4px;
      border-radius:3px;white-space:nowrap;">${safeName}</div>
  `
  return el
}

export function createDriverMarker(driver: Driver, map: mapboxgl.Map): mapboxgl.Marker | null {
  if (!driver.current_lat || !driver.current_lng) return null
  const el = createMarkerElement(driver)
  return new mapboxgl.Marker({ element: el })
    .setLngLat([driver.current_lng, driver.current_lat])
    .addTo(map)
}

export function updateDriverMarker(marker: mapboxgl.Marker, driver: Driver): void {
  if (!driver.current_lat || !driver.current_lng) return
  marker.setLngLat([driver.current_lng, driver.current_lat])

  const color = STATUS_COLORS[driver.status]
  const name = driver.profile?.full_name ?? 'Driver'
  const el = marker.getElement()
  const inner = el.firstElementChild as HTMLElement | null
  if (inner) {
    inner.style.background = color
    const initial = inner.firstElementChild as HTMLElement | null
    if (initial) initial.textContent = name.split(' ')[0].charAt(0)
  }
}
