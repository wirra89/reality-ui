# TaxiBase — Plan 2: Core Ride Flow

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full ride lifecycle — customer requests a ride, dispatcher sees it and assigns a driver, driver accepts and updates status through to completion, customer sees realtime status updates.

**Architecture:** Customer creates a ride row in Supabase. Dispatcher and driver subscribe to Supabase Realtime channels to receive updates instantly. Status transitions are enforced by a shared state machine. All three apps share `RideStatusBadge` and `DriverStatusBadge` components.

**Tech Stack:** Supabase Realtime (postgres_changes) · Google Maps Places Autocomplete · React hooks for subscriptions · Tailwind dark theme

**Prerequisite:** Plan 1 complete (schema, auth, routing all working).

---

## File Map

| File | Responsibility |
|---|---|
| `lib/ride-status.ts` | status transition validation + labels |
| `lib/ride-status.test.ts` | status machine tests |
| `components/RideStatusBadge.tsx` | coloured status pill |
| `components/DriverStatusBadge.tsx` | coloured driver status pill |
| `components/RideCard.tsx` | compact ride card (queue + history) |
| `components/DriverCard.tsx` | driver card in bottom strip |
| `components/ActiveRideTimeline.tsx` | ride event log |
| `hooks/useRealtime.ts` | generic Supabase Realtime subscription hook |
| `hooks/useActiveRide.ts` | customer's current active ride |
| `hooks/useAssignedRide.ts` | driver's current assigned ride |
| `app/(customer)/request/page.tsx` | address input + fare estimate + submit |
| `app/(customer)/ride/[id]/page.tsx` | live ride tracking for customer |
| `app/(driver)/dashboard/page.tsx` | online/offline toggle + incoming ride |
| `app/(driver)/ride/[id]/page.tsx` | driver ride controls |
| `app/(dispatcher)/dashboard/page.tsx` | full dispatcher UI shell |
| `app/(dispatcher)/rides/page.tsx` | all rides list |

---

## Task 1: Ride status machine

**Files:**
- Create: `lib/ride-status.test.ts`
- Create: `lib/ride-status.ts`

- [ ] **Step 1: Write tests**

Create `lib/ride-status.test.ts`:

```typescript
import { canTransition, rideStatusLabel, rideStatusColor, DRIVER_TRANSITIONS } from './ride-status'

describe('canTransition', () => {
  it('allows valid driver transitions', () => {
    expect(canTransition('assigned', 'driver_arriving', 'driver')).toBe(true)
    expect(canTransition('driver_arriving', 'arrived', 'driver')).toBe(true)
    expect(canTransition('arrived', 'in_progress', 'driver')).toBe(true)
    expect(canTransition('in_progress', 'completed', 'driver')).toBe(true)
  })

  it('blocks invalid transitions', () => {
    expect(canTransition('requested', 'in_progress', 'driver')).toBe(false)
    expect(canTransition('completed', 'in_progress', 'driver')).toBe(false)
  })

  it('allows dispatcher to assign', () => {
    expect(canTransition('requested', 'assigned', 'dispatcher')).toBe(true)
  })

  it('allows customer to cancel when requested', () => {
    expect(canTransition('requested', 'cancelled', 'customer')).toBe(true)
  })

  it('blocks customer cancelling in_progress ride', () => {
    expect(canTransition('in_progress', 'cancelled', 'customer')).toBe(false)
  })
})

describe('rideStatusLabel', () => {
  it('returns human-readable labels', () => {
    expect(rideStatusLabel('requested')).toBe('Waiting for driver')
    expect(rideStatusLabel('driver_arriving')).toBe('Driver arriving')
    expect(rideStatusLabel('in_progress')).toBe('On the way')
    expect(rideStatusLabel('completed')).toBe('Completed')
  })
})
```

- [ ] **Step 2: Run tests — expect fail**

```bash
npx jest lib/ride-status.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ride status module**

Create `lib/ride-status.ts`:

```typescript
import type { RideStatus, UserRole } from './types'

type Transition = { from: RideStatus; to: RideStatus; roles: UserRole[] }

const TRANSITIONS: Transition[] = [
  { from: 'requested',       to: 'assigned',        roles: ['dispatcher', 'admin'] },
  { from: 'requested',       to: 'cancelled',       roles: ['customer', 'dispatcher', 'admin'] },
  { from: 'assigned',        to: 'driver_arriving', roles: ['driver'] },
  { from: 'assigned',        to: 'cancelled',       roles: ['dispatcher', 'admin'] },
  { from: 'driver_arriving', to: 'arrived',         roles: ['driver'] },
  { from: 'driver_arriving', to: 'cancelled',       roles: ['dispatcher', 'admin'] },
  { from: 'arrived',         to: 'in_progress',     roles: ['driver'] },
  { from: 'in_progress',     to: 'completed',       roles: ['driver'] },
  { from: 'in_progress',     to: 'cancelled',       roles: ['dispatcher', 'admin'] },
]

export const DRIVER_TRANSITIONS: Partial<Record<RideStatus, { label: string; next: RideStatus }>> = {
  assigned:        { label: 'Start Driving to Pickup', next: 'driver_arriving' },
  driver_arriving: { label: 'Mark Arrived at Pickup',  next: 'arrived' },
  arrived:         { label: 'Start Ride',              next: 'in_progress' },
  in_progress:     { label: 'Complete Ride',           next: 'completed' },
}

export function canTransition(from: RideStatus, to: RideStatus, role: UserRole): boolean {
  return TRANSITIONS.some(t => t.from === from && t.to === to && t.roles.includes(role))
}

export function rideStatusLabel(status: RideStatus): string {
  const labels: Record<RideStatus, string> = {
    requested:       'Waiting for driver',
    assigned:        'Driver assigned',
    driver_arriving: 'Driver arriving',
    arrived:         'Driver arrived',
    in_progress:     'On the way',
    completed:       'Completed',
    cancelled:       'Cancelled',
  }
  return labels[status]
}

export function rideStatusColor(status: RideStatus): string {
  const colors: Record<RideStatus, string> = {
    requested:       'text-orange-400 bg-orange-400/10 border-orange-400/30',
    assigned:        'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    driver_arriving: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    arrived:         'text-purple-400 bg-purple-400/10 border-purple-400/30',
    in_progress:     'text-green-400 bg-green-400/10 border-green-400/30',
    completed:       'text-gray-400 bg-gray-400/10 border-gray-400/30',
    cancelled:       'text-red-400 bg-red-400/10 border-red-400/30',
  }
  return colors[status]
}

export function driverStatusColor(status: string): string {
  const colors: Record<string, string> = {
    offline:  'text-gray-500',
    online:   'text-green-400',
    assigned: 'text-yellow-400',
    arriving: 'text-blue-400',
    waiting:  'text-purple-400',
    on_trip:  'text-green-300',
  }
  return colors[status] ?? 'text-gray-400'
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx jest lib/ride-status.test.ts
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add lib/ride-status.ts lib/ride-status.test.ts
git commit -m "feat: ride status state machine with transition validation"
```

---

## Task 2: Shared UI components

**Files:**
- Create: `components/RideStatusBadge.tsx`
- Create: `components/DriverStatusBadge.tsx`
- Create: `components/RideCard.tsx`
- Create: `components/DriverCard.tsx`

- [ ] **Step 1: RideStatusBadge**

Create `components/RideStatusBadge.tsx`:

```typescript
import { rideStatusColor, rideStatusLabel } from '@/lib/ride-status'
import type { RideStatus } from '@/lib/types'

export function RideStatusBadge({ status }: { status: RideStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${rideStatusColor(status)}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {rideStatusLabel(status).toUpperCase()}
    </span>
  )
}
```

- [ ] **Step 2: DriverStatusBadge**

Create `components/DriverStatusBadge.tsx`:

```typescript
import { driverStatusColor } from '@/lib/ride-status'
import type { DriverStatus } from '@/lib/types'

const LABELS: Record<DriverStatus, string> = {
  offline:  'Offline',
  online:   'Online',
  assigned: 'Assigned',
  arriving: 'Arriving',
  waiting:  'Waiting',
  on_trip:  'On Trip',
}

export function DriverStatusBadge({ status }: { status: DriverStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${driverStatusColor(status)}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {LABELS[status]}
    </span>
  )
}
```

- [ ] **Step 3: RideCard**

Create `components/RideCard.tsx`:

```typescript
import type { Ride } from '@/lib/types'
import { RideStatusBadge } from './RideStatusBadge'
import { formatPrice } from '@/lib/pricing'

interface RideCardProps {
  ride: Ride
  onClick?: () => void
  selected?: boolean
  currency?: string
}

export function RideCard({ ride, onClick, selected, currency = 'EUR' }: RideCardProps) {
  const elapsed = Math.floor((Date.now() - new Date(ride.requested_at).getTime()) / 60000)

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-3 cursor-pointer transition-all ${
        selected
          ? 'border-taxi-yellow bg-taxi-yellow/5'
          : 'border-taxi-border bg-taxi-card hover:border-taxi-yellow/50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <RideStatusBadge status={ride.status} />
        <span className="text-xs text-taxi-muted">{elapsed}m ago</span>
      </div>

      <div className="space-y-1 mb-2">
        <p className="text-sm text-white flex items-center gap-1.5">
          <span className="text-taxi-yellow text-xs">●</span>
          {ride.pickup_address ?? 'Unknown pickup'}
        </p>
        <p className="text-sm text-taxi-muted flex items-center gap-1.5">
          <span className="text-xs">→</span>
          {ride.destination_address ?? 'Unknown destination'}
        </p>
      </div>

      {ride.estimated_price && (
        <p className="text-taxi-yellow text-sm font-bold">
          {formatPrice(ride.estimated_price, currency)}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: DriverCard**

Create `components/DriverCard.tsx`:

```typescript
import type { Driver } from '@/lib/types'
import { DriverStatusBadge } from './DriverStatusBadge'

interface DriverCardProps {
  driver: Driver
  onClick?: () => void
  selected?: boolean
}

export function DriverCard({ driver, onClick, selected }: DriverCardProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all whitespace-nowrap ${
        selected
          ? 'border-taxi-yellow bg-taxi-yellow/5'
          : 'border-taxi-border bg-taxi-card hover:border-taxi-yellow/40'
      }`}
    >
      <div className="w-7 h-7 rounded-full bg-taxi-border flex items-center justify-center text-xs font-bold text-white">
        {driver.profile?.full_name?.[0] ?? 'D'}
      </div>
      <div>
        <p className="text-sm text-white font-medium">{driver.profile?.full_name ?? 'Driver'}</p>
        <p className="text-xs text-taxi-muted">{driver.car_model ?? 'Unknown vehicle'}</p>
      </div>
      <DriverStatusBadge status={driver.status} />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/
git commit -m "feat: RideStatusBadge, DriverStatusBadge, RideCard, DriverCard components"
```

---

## Task 3: Realtime hooks

**Files:**
- Create: `hooks/useRealtime.ts`
- Create: `hooks/useActiveRide.ts`
- Create: `hooks/useAssignedRide.ts`
- Create: `hooks/useOnlineDrivers.ts`

- [ ] **Step 1: Generic realtime hook**

Create `hooks/useRealtime.ts`:

```typescript
'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface RealtimeOptions {
  table: string
  schema?: string
  filter?: string
  event?: ChangeEvent
  onInsert?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  onUpdate?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  onDelete?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
}

export function useRealtime(options: RealtimeOptions) {
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const channelName = `${options.table}-${options.filter ?? 'all'}-${Date.now()}`
    const channel = supabase.channel(channelName)

    channel.on(
      // @ts-expect-error — Supabase JS v2 type overloads require this pattern
      'postgres_changes',
      {
        event: options.event ?? '*',
        schema: options.schema ?? 'public',
        table: options.table,
        filter: options.filter,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        if (payload.eventType === 'INSERT' && options.onInsert) options.onInsert(payload)
        if (payload.eventType === 'UPDATE' && options.onUpdate) options.onUpdate(payload)
        if (payload.eventType === 'DELETE' && options.onDelete) options.onDelete(payload)
      }
    )

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [options.table, options.filter]) // eslint-disable-line react-hooks/exhaustive-deps
}
```

- [ ] **Step 2: Customer active ride hook**

Create `hooks/useActiveRide.ts`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from './useRealtime'
import type { Ride } from '@/lib/types'

const ACTIVE_STATUSES = ['requested', 'assigned', 'driver_arriving', 'arrived', 'in_progress']

export function useActiveRide(customerId: string | null) {
  const [ride, setRide] = useState<Ride | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!customerId) { setLoading(false); return }

    const supabase = createClient()
    supabase
      .from('rides')
      .select('*, driver:drivers(*, profile:profiles(*))')
      .eq('customer_id', customerId)
      .in('status', ACTIVE_STATUSES)
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setRide(data as Ride | null)
        setLoading(false)
      })
  }, [customerId])

  useRealtime({
    table: 'rides',
    filter: customerId ? `customer_id=eq.${customerId}` : undefined,
    onUpdate: (payload) => {
      const updated = payload.new as Ride
      setRide(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
    },
  })

  return { ride, loading }
}
```

- [ ] **Step 3: Driver assigned ride hook**

Create `hooks/useAssignedRide.ts`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from './useRealtime'
import type { Ride } from '@/lib/types'

export function useAssignedRide(driverId: string | null) {
  const [ride, setRide] = useState<Ride | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!driverId) { setLoading(false); return }

    const supabase = createClient()
    supabase
      .from('rides')
      .select('*, customer:profiles!customer_id(*)')
      .eq('driver_id', driverId)
      .in('status', ['assigned', 'driver_arriving', 'arrived', 'in_progress'])
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setRide(data as Ride | null)
        setLoading(false)
      })
  }, [driverId])

  useRealtime({
    table: 'rides',
    filter: driverId ? `driver_id=eq.${driverId}` : undefined,
    onUpdate: (payload) => {
      const updated = payload.new as Ride
      setRide(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
    },
    onInsert: (payload) => {
      setRide(payload.new as Ride)
    },
  })

  return { ride, loading }
}
```

- [ ] **Step 4: Online drivers hook (for dispatcher)**

Create `hooks/useOnlineDrivers.ts`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from './useRealtime'
import type { Driver } from '@/lib/types'

export function useOnlineDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('drivers')
      .select('*, profile:profiles(*)')
      .neq('status', 'offline')
      .eq('is_active', true)
      .then(({ data }) => {
        setDrivers((data ?? []) as Driver[])
        setLoading(false)
      })
  }, [])

  useRealtime({
    table: 'drivers',
    onUpdate: (payload) => {
      const updated = payload.new as Driver
      setDrivers(prev => {
        const exists = prev.find(d => d.id === updated.id)
        if (updated.status === 'offline') return prev.filter(d => d.id !== updated.id)
        if (exists) return prev.map(d => d.id === updated.id ? { ...d, ...updated } : d)
        return [...prev, updated]
      })
    },
    onInsert: (payload) => {
      const driver = payload.new as Driver
      if (driver.status !== 'offline') setDrivers(prev => [...prev, driver])
    },
  })

  return { drivers, loading }
}
```

- [ ] **Step 5: Commit**

```bash
git add hooks/
git commit -m "feat: realtime hooks for rides and drivers"
```

---

## Task 4: Customer — request ride

**Files:**
- Create: `app/(customer)/request/page.tsx`
- Modify: `app/(customer)/dashboard/page.tsx`

- [ ] **Step 1: Write request page**

Create `app/(customer)/request/page.tsx`:

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { estimateFare, formatPrice } from '@/lib/pricing'
import type { CompanySettings } from '@/lib/types'

export default function RequestRidePage() {
  const router = useRouter()
  const [pickup, setPickup] = useState('')
  const [destination, setDestination] = useState('')
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pickupRef = useRef<HTMLInputElement>(null)
  const destRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('company_settings').select('*').single().then(({ data }) => {
      setSettings(data)
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.google) return

    const pickupAC = new google.maps.places.Autocomplete(pickupRef.current!, { types: ['address'] })
    pickupAC.addListener('place_changed', () => {
      const place = pickupAC.getPlace()
      setPickup(place.formatted_address ?? '')
      const loc = place.geometry?.location
      if (loc) setPickupCoords({ lat: loc.lat(), lng: loc.lng() })
    })

    const destAC = new google.maps.places.Autocomplete(destRef.current!, { types: ['address'] })
    destAC.addListener('place_changed', () => {
      const place = destAC.getPlace()
      setDestination(place.formatted_address ?? '')
      const loc = place.geometry?.location
      if (loc) setDestCoords({ lat: loc.lat(), lng: loc.lng() })
    })
  }, [])

  useEffect(() => {
    if (!pickupCoords || !destCoords) return
    const service = new google.maps.DistanceMatrixService()
    service.getDistanceMatrix(
      {
        origins: [new google.maps.LatLng(pickupCoords.lat, pickupCoords.lng)],
        destinations: [new google.maps.LatLng(destCoords.lat, destCoords.lng)],
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          const meters = result!.rows[0].elements[0].distance.value
          setDistanceKm(meters / 1000)
        }
      }
    )
  }, [pickupCoords, destCoords])

  async function useCurrentLocation() {
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      setPickupCoords({ lat, lng })
      const geocoder = new google.maps.Geocoder()
      const { results } = await geocoder.geocode({ location: { lat, lng } })
      if (results[0]) setPickup(results[0].formatted_address)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pickupCoords || !destCoords || !settings) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const estimated_price = distanceKm
      ? estimateFare(distanceKm, settings)
      : settings.minimum_fare

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .insert({
        customer_id: user.id,
        pickup_address: pickup,
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        destination_address: destination,
        destination_lat: destCoords.lat,
        destination_lng: destCoords.lng,
        estimated_price,
        notes: notes || null,
        status: 'requested',
      })
      .select()
      .single()

    if (rideError) {
      setError(rideError.message)
      setLoading(false)
      return
    }

    router.push(`/customer/ride/${ride.id}`)
  }

  const estimatedFare = distanceKm && settings
    ? estimateFare(distanceKm, settings)
    : null

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-taxi-muted hover:text-white">←</button>
        <h1 className="text-xl font-bold">Request a Ride</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Pickup</label>
          <div className="relative">
            <input
              ref={pickupRef}
              type="text"
              value={pickup}
              onChange={e => setPickup(e.target.value)}
              required
              className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow pr-12"
              placeholder="Enter pickup address"
            />
            <button
              type="button"
              onClick={useCurrentLocation}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-taxi-muted hover:text-taxi-yellow text-sm"
              title="Use current location"
            >
              📍
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Destination</label>
          <input
            ref={destRef}
            type="text"
            value={destination}
            onChange={e => setDestination(e.target.value)}
            required
            className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
            placeholder="Enter destination"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
            placeholder="e.g. Ring the bell, call on arrival"
          />
        </div>

        {estimatedFare && settings && (
          <div className="bg-taxi-card border border-taxi-border rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-taxi-muted mb-1">Estimated Fare</p>
            <p className="text-3xl font-bold text-taxi-yellow">
              {formatPrice(estimatedFare, settings.currency)}
            </p>
            {distanceKm && (
              <p className="text-sm text-taxi-muted mt-1">{distanceKm.toFixed(1)} km · Cash payment</p>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !pickupCoords || !destCoords}
          className="w-full bg-taxi-yellow text-black font-bold py-4 rounded-xl text-lg hover:bg-yellow-400 transition disabled:opacity-50"
        >
          {loading ? 'Requesting...' : 'Request Taxi'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Update customer dashboard**

Replace `app/(customer)/dashboard/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useActiveRide } from '@/hooks/useActiveRide'
import { RideStatusBadge } from '@/components/RideStatusBadge'
import type { Profile } from '@/lib/types'

export default function CustomerDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const { ride, loading } = useActiveRide(userId)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    })
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-taxi-muted text-sm">Welcome back</p>
          <h1 className="text-xl font-bold">{profile?.full_name ?? 'Customer'}</h1>
        </div>
        <button onClick={handleSignOut} className="text-taxi-muted text-sm hover:text-white">
          Sign out
        </button>
      </div>

      {!loading && ride ? (
        <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-3">Active Ride</p>
          <RideStatusBadge status={ride.status} />
          <div className="mt-3 space-y-1">
            <p className="text-sm text-white">📍 {ride.pickup_address}</p>
            <p className="text-sm text-taxi-muted">→ {ride.destination_address}</p>
          </div>
          <button
            onClick={() => router.push(`/customer/ride/${ride.id}`)}
            className="mt-4 w-full bg-taxi-yellow text-black font-bold py-3 rounded-lg text-sm"
          >
            Track Ride
          </button>
        </div>
      ) : null}

      {!loading && !ride ? (
        <button
          onClick={() => router.push('/customer/request')}
          className="w-full bg-taxi-yellow text-black font-bold py-5 rounded-xl text-lg"
        >
          🚕 Request a Taxi
        </button>
      ) : null}

      <button
        onClick={() => router.push('/customer/history')}
        className="mt-4 w-full bg-taxi-card border border-taxi-border text-white py-4 rounded-xl text-sm"
      >
        Ride History
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Add Google Maps script to root layout**

Edit `app/layout.tsx` — add the Maps script before `</body>`:

```typescript
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TaxiBase',
  description: 'Modern taxi dispatch platform',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#FFD700',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-taxi-dark text-white antialiased`}>
        {children}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="beforeInteractive"
        />
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(customer)/ app/layout.tsx
git commit -m "feat: customer request ride flow with fare estimation"
```

---

## Task 5: Customer — live ride tracking page

**Files:**
- Create: `app/(customer)/ride/[id]/page.tsx`
- Create: `components/ActiveRideTimeline.tsx`

- [ ] **Step 1: Create timeline component**

Create `components/ActiveRideTimeline.tsx`:

```typescript
import { rideStatusLabel } from '@/lib/ride-status'
import type { RideStatus } from '@/lib/types'

const STEPS: RideStatus[] = ['requested', 'assigned', 'driver_arriving', 'arrived', 'in_progress', 'completed']

interface ActiveRideTimelineProps {
  currentStatus: RideStatus
}

export function ActiveRideTimeline({ currentStatus }: ActiveRideTimelineProps) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3 text-center">
        <p className="text-red-400 font-semibold text-sm">Ride Cancelled</p>
      </div>
    )
  }

  const currentIndex = STEPS.indexOf(currentStatus)

  return (
    <div className="space-y-0">
      {STEPS.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={step} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full border-2 mt-1 ${
                active ? 'bg-taxi-yellow border-taxi-yellow' :
                done ? 'bg-green-400 border-green-400' :
                'bg-transparent border-taxi-border'
              }`} />
              {i < STEPS.length - 1 && (
                <div className={`w-0.5 h-6 ${done ? 'bg-green-400' : 'bg-taxi-border'}`} />
              )}
            </div>
            <p className={`text-sm pb-2 ${
              active ? 'text-white font-semibold' :
              done ? 'text-green-400' :
              'text-taxi-muted'
            }`}>
              {rideStatusLabel(step)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create customer ride tracking page**

Create `app/(customer)/ride/[id]/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/useRealtime'
import { RideStatusBadge } from '@/components/RideStatusBadge'
import { ActiveRideTimeline } from '@/components/ActiveRideTimeline'
import { formatPrice } from '@/lib/pricing'
import type { Ride } from '@/lib/types'

export default function CustomerRidePage() {
  const params = useParams()
  const router = useRouter()
  const rideId = params.id as string
  const [ride, setRide] = useState<Ride | null>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="min-h-screen p-6 pb-24">
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
              <p className="text-taxi-muted text-sm">{driver.car_model} · {driver.car_plate}</p>
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

      {/* Cancel button — only when requested */}
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
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(customer)/ride/ components/ActiveRideTimeline.tsx
git commit -m "feat: customer ride tracking page with realtime status"
```

---

## Task 6: Driver app — dashboard + status toggle

**Files:**
- Modify: `app/(driver)/dashboard/page.tsx`

- [ ] **Step 1: Replace driver dashboard**

Replace `app/(driver)/dashboard/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAssignedRide } from '@/hooks/useAssignedRide'
import { RideCard } from '@/components/RideCard'
import type { Profile, Driver } from '@/lib/types'

export default function DriverDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [driverRecord, setDriverRecord] = useState<Driver | null>(null)
  const [toggling, setToggling] = useState(false)
  const { ride } = useAssignedRide(driverRecord?.id ?? null)

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
    // Set offline before signing out
    if (driverRecord) {
      await supabase.from('drivers').update({ status: 'offline' }).eq('id', driverRecord.id)
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isOnline = driverRecord?.status !== 'offline'

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

      {/* Online/offline toggle */}
      <div className="bg-taxi-card border border-taxi-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-white text-lg">
              {isOnline ? '🟢 You are Online' : '⚫ You are Offline'}
            </p>
            <p className="text-taxi-muted text-sm mt-1">
              {isOnline ? 'Accepting ride requests' : 'Not accepting rides'}
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

      {/* Active ride */}
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
git add app/(driver)/
git commit -m "feat: driver dashboard with online/offline toggle"
```

---

## Task 7: Driver — ride controls

**Files:**
- Create: `app/(driver)/ride/[id]/page.tsx`

- [ ] **Step 1: Create driver ride page**

Create `app/(driver)/ride/[id]/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/useRealtime'
import { RideStatusBadge } from '@/components/RideStatusBadge'
import { DRIVER_TRANSITIONS } from '@/lib/ride-status'
import { formatPrice } from '@/lib/pricing'
import type { Ride, Driver } from '@/lib/types'

const STATUS_TO_DRIVER_STATUS: Partial<Record<string, string>> = {
  driver_arriving: 'arriving',
  arrived:         'waiting',
  in_progress:     'on_trip',
  completed:       'online',
}

export default function DriverRidePage() {
  const params = useParams()
  const router = useRouter()
  const rideId = params.id as string
  const [ride, setRide] = useState<Ride | null>(null)
  const [driverRecord, setDriverRecord] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('rides').select('*, customer:profiles!customer_id(*)').eq('id', rideId).single(),
      supabase.auth.getUser().then(({ data: { user } }) =>
        user ? supabase.from('drivers').select('*').eq('user_id', user.id).single() : { data: null }
      ),
    ]).then(([{ data: rideData }, { data: driverData }]) => {
      setRide(rideData as Ride | null)
      setDriverRecord(driverData as Driver | null)
      setLoading(false)
    })
  }, [rideId])

  useRealtime({
    table: 'rides',
    filter: `id=eq.${rideId}`,
    onUpdate: (payload) => setRide(prev => prev ? { ...prev, ...payload.new as Ride } : null),
  })

  async function advanceStatus() {
    if (!ride || !driverRecord) return
    const transition = DRIVER_TRANSITIONS[ride.status]
    if (!transition) return

    setAdvancing(true)
    const supabase = createClient()
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { status: transition.next }

    if (transition.next === 'driver_arriving') updates.assigned_at = now
    if (transition.next === 'in_progress') updates.started_at = now
    if (transition.next === 'completed') { updates.completed_at = now; updates.final_price = ride.estimated_price }

    await supabase.from('rides').update(updates).eq('id', ride.id)

    // Update driver status
    const newDriverStatus = STATUS_TO_DRIVER_STATUS[transition.next]
    if (newDriverStatus) {
      await supabase.from('drivers').update({ status: newDriverStatus }).eq('id', driverRecord.id)
      setDriverRecord(prev => prev ? { ...prev, status: newDriverStatus as Driver['status'] } : null)
    }

    if (transition.next === 'completed') {
      router.push('/driver/dashboard')
    }

    setAdvancing(false)
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

  const transition = DRIVER_TRANSITIONS[ride.status]
  const customer = ride.customer as { full_name?: string; phone?: string } | undefined

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/driver/dashboard')} className="text-taxi-muted hover:text-white">←</button>
        <h1 className="text-xl font-bold">Ride Controls</h1>
        <div className="ml-auto">
          <RideStatusBadge status={ride.status} />
        </div>
      </div>

      {/* Customer info */}
      <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-4">
        <p className="text-xs uppercase tracking-wider text-taxi-muted mb-3">Customer</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">{customer?.full_name ?? 'Customer'}</p>
          </div>
          {customer?.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              📞 Call
            </a>
          )}
        </div>
      </div>

      {/* Route */}
      <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-6">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-taxi-yellow mt-0.5">●</span>
            <div>
              <p className="text-xs text-taxi-muted">Pickup</p>
              <p className="text-sm text-white">{ride.pickup_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-taxi-muted mt-0.5">→</span>
            <div>
              <p className="text-xs text-taxi-muted">Destination</p>
              <p className="text-sm text-white">{ride.destination_address}</p>
            </div>
          </div>
        </div>
        {ride.estimated_price && (
          <p className="text-taxi-yellow font-bold text-xl mt-3">
            ~{formatPrice(ride.estimated_price, 'EUR')}
          </p>
        )}
        {ride.notes && (
          <p className="text-taxi-muted text-sm mt-2">📝 {ride.notes}</p>
        )}
      </div>

      {/* Navigate button */}
      {ride.pickup_lat && ride.pickup_lng && ride.status === 'assigned' && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${ride.pickup_lat},${ride.pickup_lng}`}
          target="_blank"
          rel="noreferrer"
          className="block w-full text-center bg-blue-600 text-white font-bold py-4 rounded-xl mb-4"
        >
          🗺️ Navigate to Pickup
        </a>
      )}

      {ride.destination_lat && ride.destination_lng && ride.status === 'in_progress' && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${ride.destination_lat},${ride.destination_lng}`}
          target="_blank"
          rel="noreferrer"
          className="block w-full text-center bg-blue-600 text-white font-bold py-4 rounded-xl mb-4"
        >
          🗺️ Navigate to Destination
        </a>
      )}

      {/* Status advance button */}
      {transition && (
        <button
          onClick={advanceStatus}
          disabled={advancing}
          className="w-full bg-taxi-yellow text-black font-bold py-5 rounded-xl text-lg disabled:opacity-50"
        >
          {advancing ? 'Updating...' : transition.label}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(driver)/ride/
git commit -m "feat: driver ride controls with status advancement"
```

---

## Task 8: Dispatcher dashboard

**Files:**
- Modify: `app/(dispatcher)/dashboard/page.tsx`
- Create: `components/DispatcherPanel.tsx`
- Create: `hooks/usePendingRides.ts`

- [ ] **Step 1: Pending rides hook**

Create `hooks/usePendingRides.ts`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from './useRealtime'
import type { Ride } from '@/lib/types'

const ACTIVE_STATUSES = ['requested', 'assigned', 'driver_arriving', 'arrived', 'in_progress']

export function usePendingRides() {
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('rides')
      .select('*, customer:profiles!customer_id(*), driver:drivers(*, profile:profiles(*))')
      .in('status', ACTIVE_STATUSES)
      .order('requested_at', { ascending: true })
      .then(({ data }) => {
        setRides((data ?? []) as Ride[])
        setLoading(false)
      })
  }, [])

  useRealtime({
    table: 'rides',
    onInsert: (payload) => setRides(prev => [payload.new as Ride, ...prev]),
    onUpdate: (payload) => {
      const updated = payload.new as Ride
      if (!ACTIVE_STATUSES.includes(updated.status)) {
        setRides(prev => prev.filter(r => r.id !== updated.id))
      } else {
        setRides(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
      }
    },
  })

  return { rides, loading }
}
```

- [ ] **Step 2: Replace dispatcher dashboard**

Replace `app/(dispatcher)/dashboard/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { usePendingRides } from '@/hooks/usePendingRides'
import { useOnlineDrivers } from '@/hooks/useOnlineDrivers'
import { RideCard } from '@/components/RideCard'
import { DriverCard } from '@/components/DriverCard'
import { DispatcherPanel } from '@/components/DispatcherPanel'
import { createClient } from '@/lib/supabase/client'
import type { Ride } from '@/lib/types'

export default function DispatcherDashboard() {
  const { rides, loading: ridesLoading } = usePendingRides()
  const { drivers } = useOnlineDrivers()
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null)

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

        {/* Center: map placeholder */}
        <div className="flex-1 bg-[#1a1f2e] relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-taxi-muted text-sm">Live map loads in Plan 3</p>
          </div>
          <div className="absolute bottom-3 right-3 bg-black/50 text-taxi-muted text-xs px-2 py-1 rounded">
            Google Maps · Live
          </div>
        </div>

        {/* Right panel: ride detail + assign */}
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

- [ ] **Step 3: Create DispatcherPanel**

Create `components/DispatcherPanel.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RideStatusBadge } from './RideStatusBadge'
import { formatPrice } from '@/lib/pricing'
import type { Ride, Driver } from '@/lib/types'

interface DispatcherPanelProps {
  ride: Ride | null
  drivers: Driver[]
}

export function DispatcherPanel({ ride, drivers }: DispatcherPanelProps) {
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [assigning, setAssigning] = useState(false)

  async function assignDriver() {
    if (!ride || !selectedDriverId) return
    setAssigning(true)
    const supabase = createClient()
    await supabase.from('rides').update({
      driver_id: selectedDriverId,
      status: 'assigned',
      assigned_at: new Date().toISOString(),
    }).eq('id', ride.id)
    await supabase.from('drivers').update({ status: 'assigned' }).eq('id', selectedDriverId)
    setAssigning(false)
    setSelectedDriverId('')
  }

  if (!ride) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <p className="text-taxi-muted text-xs text-center">Select a ride from the queue</p>
      </div>
    )
  }

  const customer = ride.customer as { full_name?: string; phone?: string } | undefined

  return (
    <div className="p-3 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-taxi-muted mb-2">Status</p>
        <RideStatusBadge status={ride.status} />
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-taxi-muted mb-2">Customer</p>
        <p className="text-sm text-white font-semibold">{customer?.full_name ?? '—'}</p>
        {customer?.phone && (
          <a href={`tel:${customer.phone}`} className="text-xs text-green-400 mt-1 block">
            {customer.phone}
          </a>
        )}
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-taxi-muted mb-2">Route</p>
        <p className="text-xs text-white">📍 {ride.pickup_address}</p>
        <p className="text-xs text-taxi-muted mt-1">→ {ride.destination_address}</p>
      </div>

      {ride.estimated_price && (
        <div>
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-1">Fare</p>
          <p className="text-taxi-yellow font-bold text-lg">{formatPrice(ride.estimated_price, 'EUR')}</p>
          <p className="text-xs text-taxi-muted">Cash</p>
        </div>
      )}

      {ride.status === 'requested' && (
        <div>
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-2">Assign Driver</p>
          <select
            value={selectedDriverId}
            onChange={e => setSelectedDriverId(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-taxi-border text-white text-xs rounded-lg px-2 py-2 mb-2 focus:outline-none focus:border-taxi-yellow"
          >
            <option value="">Select driver...</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>
                {d.profile?.full_name ?? 'Driver'} · {d.car_model}
              </option>
            ))}
          </select>
          <button
            onClick={assignDriver}
            disabled={!selectedDriverId || assigning}
            className="w-full bg-taxi-yellow text-black font-bold py-2 rounded-lg text-xs disabled:opacity-50"
          >
            {assigning ? 'Assigning...' : 'Assign Ride'}
          </button>
        </div>
      )}

      {customer?.phone && (
        <a
          href={`tel:${customer.phone}`}
          className="block w-full text-center border border-taxi-border text-taxi-muted py-2 rounded-lg text-xs hover:border-taxi-yellow hover:text-white transition"
        >
          📞 Call Customer
        </a>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(dispatcher)/ components/DispatcherPanel.tsx hooks/usePendingRides.ts
git commit -m "feat: dispatcher dashboard with ride queue, driver strip, assign panel"
```

---

## Task 9: End-to-end smoke test

- [ ] **Step 1: Run the full demo flow**

```bash
npm run dev
```

1. Register a **customer** account → arrives at `/customer/dashboard`
2. Click "Request a Taxi" → enter pickup + destination → confirm fare estimate → submit
3. In Supabase dashboard, confirm a `rides` row with `status = 'requested'`
4. Open a second browser tab → register a **dispatcher** account (requires manually setting `role = 'dispatcher'` in Supabase profiles table for now, or create via Supabase dashboard)
5. Dispatcher sees the ride appear in the queue instantly (Realtime)
6. Dispatcher selects the ride → picks a driver from dropdown → clicks Assign
7. In Supabase, confirm `rides.status = 'assigned'`
8. Register a **driver** account (set role = 'driver' manually) → go online
9. Driver sees the assigned ride on their dashboard
10. Open `/driver/ride/[id]` → click through each status step
11. Confirm customer's `/customer/ride/[id]` updates in realtime at each step

- [ ] **Step 2: Run Jest tests**

```bash
npx jest
```

Expected: all tests pass.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete core ride flow — customer, dispatcher, driver"
```

---

## ✅ Plan 2 Complete

At this point you have:
- Full ride lifecycle: customer → dispatcher → driver → completion
- Realtime updates across all three apps
- Status state machine with tests
- Dispatcher can assign drivers from live queue
- Driver advances through all status steps
- Customer sees live ride status

**Next:** Plan 3 — GPS tracking & live maps (driver location beacon, dispatcher live map, customer driver tracking)
