# TaxiBase — Plan 3: GPS Tracking & Live Maps

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the driver phone as a GPS beacon, display all online drivers on the dispatcher's live Google Map with moving markers, and show the customer their assigned driver moving on a map in realtime.

**Architecture:** `useGPSTracking` hook in driver app calls `watchPosition` and writes to Supabase at intervals that tighten as the ride progresses. Dispatcher and customer subscribe to `drivers` table changes via Supabase Realtime and update Google Maps markers without re-rendering the map. Map instances are held in refs to avoid recreation.

**Tech Stack:** Google Maps JS API (`@googlemaps/js-api-loader`) · `navigator.geolocation.watchPosition` · Supabase Realtime · React refs for map lifecycle

**Prerequisite:** Plan 2 complete (full ride flow working).

---

## File Map

| File | Responsibility |
|---|---|
| `hooks/useGPSTracking.ts` | driver location beacon — watches position + writes to Supabase |
| `hooks/useGPSTracking.test.ts` | interval logic tests |
| `components/MapView.tsx` | reusable Google Map wrapper component |
| `components/DriverMarker.tsx` | coloured driver marker + label |
| `app/(driver)/dashboard/page.tsx` | add GPS hook when online |
| `app/(dispatcher)/dashboard/page.tsx` | replace map placeholder with live map |
| `app/(customer)/ride/[id]/page.tsx` | add driver location map |

---

## Task 1: GPS interval logic

**Files:**
- Create: `hooks/useGPSTracking.test.ts`
- Create: `hooks/useGPSTracking.ts`

- [ ] **Step 1: Write tests for interval selection**

Create `hooks/useGPSTracking.test.ts`:

```typescript
import { getUpdateIntervalMs } from './useGPSTracking'

describe('getUpdateIntervalMs', () => {
  it('returns 20s when driver is online with no ride', () => {
    expect(getUpdateIntervalMs('online')).toBe(20000)
  })

  it('returns 10s when assigned', () => {
    expect(getUpdateIntervalMs('assigned')).toBe(10000)
  })

  it('returns 5s when arriving', () => {
    expect(getUpdateIntervalMs('arriving')).toBe(5000)
  })

  it('returns 3s when on_trip', () => {
    expect(getUpdateIntervalMs('on_trip')).toBe(3000)
  })

  it('returns 20s for unknown status', () => {
    expect(getUpdateIntervalMs('waiting')).toBe(20000)
  })
})
```

- [ ] **Step 2: Run tests — expect fail**

```bash
npx jest hooks/useGPSTracking.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement GPS tracking hook**

Create `hooks/useGPSTracking.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx jest hooks/useGPSTracking.test.ts
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add hooks/useGPSTracking.ts hooks/useGPSTracking.test.ts
git commit -m "feat: GPS tracking hook with status-based update intervals"
```

---

## Task 2: Add GPS to driver dashboard

**Files:**
- Modify: `app/(driver)/dashboard/page.tsx`

- [ ] **Step 1: Wire GPS hook into driver dashboard**

In `app/(driver)/dashboard/page.tsx`, add the GPS hook. Replace the existing file with:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAssignedRide } from '@/hooks/useAssignedRide'
import { useGPSTracking } from '@/hooks/useGPSTracking'
import { RideCard } from '@/components/RideCard'
import type { Profile, Driver } from '@/lib/types'

export default function DriverDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [driverRecord, setDriverRecord] = useState<Driver | null>(null)
  const [toggling, setToggling] = useState(false)
  const { ride } = useAssignedRide(driverRecord?.id ?? null)

  const isOnline = driverRecord?.status !== 'offline'

  useGPSTracking({
    driverId: driverRecord?.id ?? '',
    driverStatus: driverRecord?.status ?? 'offline',
    enabled: isOnline && !!driverRecord?.id,
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      const { data: d } = await supabase.from('drivers').select('*').eq('user_id', user.id).single()
      setDriverRecord(d)
    })
  }, [])

  async function toggleOnline() {
    if (!driverRecord) return
    setToggling(true)
    const supabase = createClient()
    const newStatus = driverRecord.status === 'offline' ? 'online' : 'offline'
    const { data } = await supabase
      .from('drivers')
      .update({ status: newStatus })
      .eq('id', driverRecord.id)
      .select()
      .single()
    setDriverRecord(data)
    setToggling(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    if (driverRecord) {
      await supabase.from('drivers').update({ status: 'offline' }).eq('id', driverRecord.id)
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-taxi-muted text-sm">Driver</p>
          <h1 className="text-xl font-bold">{profile?.full_name ?? 'Driver'}</h1>
        </div>
        <button onClick={handleSignOut} className="text-taxi-muted text-sm hover:text-white">
          Sign out
        </button>
      </div>

      <div className="bg-taxi-card border border-taxi-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-white text-lg">
              {isOnline ? '🟢 You are Online' : '⚫ You are Offline'}
            </p>
            <p className="text-taxi-muted text-sm mt-1">
              {isOnline ? 'GPS active · Accepting rides' : 'Not accepting rides'}
            </p>
          </div>
          <button
            onClick={toggleOnline}
            disabled={toggling}
            className={`px-5 py-3 rounded-lg font-bold text-sm transition ${
              isOnline
                ? 'bg-red-900/40 text-red-400 border border-red-800 hover:bg-red-900/60'
                : 'bg-taxi-yellow text-black hover:bg-yellow-400'
            } disabled:opacity-50`}
          >
            {toggling ? '...' : isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {ride && (
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-3">Active Ride</p>
          <RideCard ride={ride} onClick={() => router.push(`/driver/ride/${ride.id}`)} />
          <button
            onClick={() => router.push(`/driver/ride/${ride.id}`)}
            className="mt-3 w-full bg-taxi-yellow text-black font-bold py-3 rounded-xl"
          >
            Open Ride Controls
          </button>
        </div>
      )}

      <button
        onClick={() => router.push('/driver/history')}
        className="mt-4 w-full bg-taxi-card border border-taxi-border text-white py-4 rounded-xl text-sm"
      >
        Ride History
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(driver)/dashboard/page.tsx
git commit -m "feat: GPS location beacon wired into driver dashboard"
```

---

## Task 3: MapView component

**Files:**
- Create: `components/MapView.tsx`
- Create: `components/DriverMarker.tsx`

- [ ] **Step 1: Create MapView**

Create `components/MapView.tsx`:

```typescript
'use client'

import { useEffect, useRef, useCallback } from 'react'

interface LatLng { lat: number; lng: number }

interface MapViewProps {
  center?: LatLng
  zoom?: number
  className?: string
  onMapReady?: (map: google.maps.Map) => void
}

export function MapView({ center, zoom = 13, className = '', onMapReady }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (typeof window === 'undefined' || !window.google) return

    const defaultCenter = center ?? { lat: 44.8176, lng: 20.4633 } // Belgrade default

    const map = new google.maps.Map(containerRef.current, {
      center: defaultCenter,
      zoom,
      mapTypeId: 'roadmap',
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      styles: DARK_MAP_STYLES,
    })

    mapRef.current = map
    onMapReady?.(map)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update center when prop changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.panTo(center)
    }
  }, [center?.lat, center?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className={`w-full h-full ${className}`} />
}

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1f2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]
```

- [ ] **Step 2: Create DriverMarker helper**

Create `components/DriverMarker.tsx`:

```typescript
// Not a React component — a factory that creates/updates Google Maps markers

import type { Driver } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  online:   '#4ade80',
  assigned: '#facc15',
  arriving: '#60a5fa',
  waiting:  '#a78bfa',
  on_trip:  '#34d399',
}

export function createDriverMarker(driver: Driver, map: google.maps.Map): google.maps.Marker | null {
  if (!driver.current_lat || !driver.current_lng) return null

  const color = STATUS_COLORS[driver.status] ?? '#9ca3af'
  const name = driver.profile?.full_name ?? 'Driver'

  const marker = new google.maps.Marker({
    position: { lat: driver.current_lat, lng: driver.current_lng },
    map,
    title: name,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    },
    label: {
      text: name.split(' ')[0],
      color: '#ffffff',
      fontSize: '10px',
      fontWeight: 'bold',
    },
    optimized: true,
  })

  return marker
}

export function updateDriverMarker(
  marker: google.maps.Marker,
  driver: Driver
): void {
  if (!driver.current_lat || !driver.current_lng) return

  marker.setPosition({ lat: driver.current_lat, lng: driver.current_lng })

  const color = STATUS_COLORS[driver.status] ?? '#9ca3af'
  marker.setIcon({
    path: google.maps.SymbolPath.CIRCLE,
    scale: 10,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add components/MapView.tsx components/DriverMarker.tsx
git commit -m "feat: MapView component with dark style, DriverMarker factory"
```

---

## Task 4: Dispatcher live map

**Files:**
- Modify: `app/(dispatcher)/dashboard/page.tsx`
- Create: `hooks/useDispatcherMap.ts`

- [ ] **Step 1: Create dispatcher map hook**

Create `hooks/useDispatcherMap.ts`:

```typescript
'use client'

import { useRef, useCallback } from 'react'
import { createDriverMarker, updateDriverMarker } from '@/components/DriverMarker'
import type { Driver } from '@/lib/types'

export function useDispatcherMap() {
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map())

  const handleMapReady = useCallback((map: google.maps.Map) => {
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
        marker.setMap(null)
        markersRef.current.delete(id)
      }
    }
  }, [])

  const addPickupMarker = useCallback((lat: number, lng: number, label: string) => {
    if (!mapRef.current) return null
    return new google.maps.Marker({
      position: { lat, lng },
      map: mapRef.current,
      title: label,
      icon: {
        url: 'data:image/svg+xml;utf-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
            <circle cx="12" cy="12" r="10" fill="#FFD700" stroke="white" stroke-width="2"/>
            <line x1="12" y1="22" x2="12" y2="32" stroke="#FFD700" stroke-width="2"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(24, 32),
        anchor: new google.maps.Point(12, 32),
      },
    })
  }, [])

  return { handleMapReady, syncDriverMarkers, addPickupMarker, mapRef }
}
```

- [ ] **Step 2: Wire live map into dispatcher dashboard**

In `app/(dispatcher)/dashboard/page.tsx`, replace the map placeholder section. The full updated file:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { usePendingRides } from '@/hooks/usePendingRides'
import { useOnlineDrivers } from '@/hooks/useOnlineDrivers'
import { useDispatcherMap } from '@/hooks/useDispatcherMap'
import { MapView } from '@/components/MapView'
import { RideCard } from '@/components/RideCard'
import { DriverCard } from '@/components/DriverCard'
import { DispatcherPanel } from '@/components/DispatcherPanel'
import type { Ride } from '@/lib/types'

export default function DispatcherDashboard() {
  const { rides, loading: ridesLoading } = usePendingRides()
  const { drivers } = useOnlineDrivers()
  const { handleMapReady, syncDriverMarkers } = useDispatcherMap()
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null)

  // Sync markers whenever drivers list updates
  useEffect(() => {
    syncDriverMarkers(drivers)
  }, [drivers, syncDriverMarkers])

  return (
    <div className="h-screen flex flex-col bg-taxi-dark overflow-hidden">
      {/* Topbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#151515] border-b border-taxi-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-taxi-yellow rounded-md" />
          <span className="text-taxi-yellow font-bold tracking-widest text-sm">TAXIBASE</span>
          <span className="text-taxi-muted text-sm ml-2">Dispatcher</span>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-green-400">● {drivers.length} online</span>
          <span className="text-orange-400">● {rides.filter(r => r.status === 'requested').length} unassigned</span>
          <span className="text-blue-400">● {rides.filter(r => r.status === 'in_progress').length} in progress</span>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-14 bg-[#0a0a0a] border-r border-[#1e1e1e] flex flex-col items-center py-3 gap-2 shrink-0">
          {[
            { icon: '⊞', label: 'Dashboard', active: true },
            { icon: '🚗', label: 'Rides' },
            { icon: '👥', label: 'Drivers' },
            { icon: '👤', label: 'Customers' },
            { icon: '📊', label: 'Analytics' },
          ].map(item => (
            <button
              key={item.label}
              title={item.label}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-base transition ${
                item.active ? 'bg-taxi-yellow text-black' : 'bg-[#1a1a1a] text-taxi-muted hover:text-white'
              }`}
            >
              {item.icon}
            </button>
          ))}
          <button title="Settings" className="mt-auto w-9 h-9 rounded-lg bg-[#1a1a1a] text-taxi-muted hover:text-white flex items-center justify-center text-base">
            ⚙️
          </button>
        </div>

        {/* Left panel: ride queue */}
        <div className="w-64 bg-[#111] border-r border-[#1e1e1e] flex flex-col overflow-hidden shrink-0">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e1e1e]">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">Ride Queue</span>
            <button className="bg-taxi-yellow text-black text-xs font-bold px-2 py-1 rounded">+ NEW</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {ridesLoading && <p className="text-taxi-muted text-xs p-2">Loading...</p>}
            {!ridesLoading && rides.length === 0 && (
              <p className="text-taxi-muted text-xs p-2">No active rides</p>
            )}
            {rides.map(ride => (
              <RideCard
                key={ride.id}
                ride={ride}
                onClick={() => setSelectedRide(ride)}
                selected={selectedRide?.id === ride.id}
              />
            ))}
          </div>
        </div>

        {/* Center: live Google Map */}
        <div className="flex-1 relative overflow-hidden">
          <MapView onMapReady={handleMapReady} className="w-full h-full" />
          <div className="absolute bottom-3 right-3 bg-black/60 text-taxi-muted text-xs px-2 py-1 rounded">
            Google Maps · Live
          </div>
        </div>

        {/* Right panel */}
        <div className="w-56 bg-[#111] border-l border-[#1e1e1e] shrink-0 overflow-y-auto">
          <DispatcherPanel
            ride={selectedRide}
            drivers={drivers.filter(d => ['online', 'waiting'].includes(d.status))}
          />
        </div>
      </div>

      {/* Bottom: driver strip */}
      <div className="shrink-0 bg-[#0a0a0a] border-t border-[#1e1e1e] px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <span className="text-taxi-muted text-xs whitespace-nowrap">ONLINE</span>
        {drivers.map(driver => (
          <DriverCard key={driver.id} driver={driver} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(dispatcher)/ hooks/useDispatcherMap.ts
git commit -m "feat: dispatcher live map with realtime driver markers"
```

---

## Task 5: Customer driver tracking map

**Files:**
- Modify: `app/(customer)/ride/[id]/page.tsx`
- Create: `hooks/useDriverLocation.ts`

- [ ] **Step 1: Create driver location hook**

Create `hooks/useDriverLocation.ts`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from './useRealtime'
import type { Driver } from '@/lib/types'

export function useDriverLocation(driverId: string | null) {
  const [driver, setDriver] = useState<Pick<Driver, 'current_lat' | 'current_lng' | 'status'> | null>(null)

  useEffect(() => {
    if (!driverId) return
    const supabase = createClient()
    supabase
      .from('drivers')
      .select('current_lat, current_lng, status')
      .eq('id', driverId)
      .single()
      .then(({ data }) => setDriver(data))
  }, [driverId])

  useRealtime({
    table: 'drivers',
    filter: driverId ? `id=eq.${driverId}` : undefined,
    onUpdate: (payload) => {
      const d = payload.new as Driver
      setDriver({ current_lat: d.current_lat, current_lng: d.current_lng, status: d.status })
    },
  })

  return driver
}
```

- [ ] **Step 2: Add map to customer ride page**

Replace `app/(customer)/ride/[id]/page.tsx` — add the map section after the driver info card. Full updated file:

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  const mapRef = useRef<google.maps.Map | null>(null)
  const driverMarkerRef = useRef<google.maps.Marker | null>(null)
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null)

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
    const pos = { lat: driverLocation.current_lat, lng: driverLocation.current_lng }

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setPosition(pos)
    } else {
      driverMarkerRef.current = new google.maps.Marker({
        position: pos,
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#FFD700',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        title: 'Your Driver',
      })
    }

    mapRef.current.panTo(pos)
  }, [driverLocation?.current_lat, driverLocation?.current_lng])

  function handleMapReady(map: google.maps.Map) {
    mapRef.current = map
    if (ride?.pickup_lat && ride?.pickup_lng) {
      pickupMarkerRef.current = new google.maps.Marker({
        position: { lat: ride.pickup_lat, lng: ride.pickup_lng },
        map,
        title: 'Pickup',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4ade80',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      })
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
```

- [ ] **Step 3: Commit**

```bash
git add app/(customer)/ride/ hooks/useDriverLocation.ts
git commit -m "feat: customer live driver tracking map"
```

---

## Task 6: End-to-end GPS smoke test

- [ ] **Step 1: Full GPS flow test**

```bash
npm run dev
```

1. Open driver app on a mobile device or Chrome DevTools with location simulation enabled (DevTools → Sensors → Geolocation)
2. Go online as driver → confirm `drivers.current_lat` updates in Supabase dashboard within 20 seconds
3. Open dispatcher dashboard → confirm driver marker appears on map
4. Customer requests a ride → dispatcher assigns driver → confirm marker turns yellow
5. Driver clicks "Start Driving" → confirm marker turns blue on dispatcher map
6. On customer `/ride/[id]` → confirm driver marker appears on map and moves as driver location updates

- [ ] **Step 2: Run all tests**

```bash
npx jest
```

Expected: all tests pass (pricing + ride status + GPS intervals).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: GPS tracking + live maps complete — dispatcher and customer"
```

---

## ✅ Plan 3 Complete

At this point you have:
- Driver phone broadcasting GPS position to Supabase at status-appropriate intervals
- Dispatcher live map: all online drivers with coloured markers, updating in realtime
- Customer ride page: live driver marker on Google Map once driver is assigned
- All GPS tests passing

**Next:** Plan 4 — Ride history, manual ride creation, company settings, PWA polish
