# TaxiBase — Plan 4: History, Manual Rides, Settings & PWA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the MVP with ride history for all roles, dispatcher manual ride creation, company settings page, and full PWA configuration so the app is installable on mobile.

**Architecture:** History pages query Supabase with pagination. Manual ride creation is a modal form in the dispatcher dashboard — dispatchers enter customer phone + addresses + can search existing customers. Settings page reads/writes `company_settings` table. PWA uses `next-pwa` for service worker generation.

**Tech Stack:** Supabase · next-pwa · Tailwind dark theme

**Prerequisite:** Plans 1–3 complete.

---

## File Map

| File | Responsibility |
|---|---|
| `app/(customer)/history/page.tsx` | paginated customer ride history |
| `app/(customer)/profile/page.tsx` | customer profile edit |
| `app/(driver)/history/page.tsx` | paginated driver ride history |
| `app/(driver)/profile/page.tsx` | driver profile + car details |
| `app/(dispatcher)/rides/page.tsx` | all rides with filters |
| `app/(dispatcher)/drivers/page.tsx` | all drivers management |
| `app/(dispatcher)/customers/page.tsx` | all customers list |
| `app/(dispatcher)/settings/page.tsx` | company settings form |
| `components/CreateRideModal.tsx` | dispatcher manual ride creation modal |
| `next.config.ts` | updated with next-pwa |
| `public/manifest.json` | complete PWA manifest |

---

## Task 1: Ride history — customer

**Files:**
- Create: `app/(customer)/history/page.tsx`
- Create: `app/(customer)/profile/page.tsx`

- [ ] **Step 1: Customer history page**

Create `app/(customer)/history/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RideCard } from '@/components/RideCard'
import type { Ride } from '@/lib/types'

const PAGE_SIZE = 20

export default function CustomerHistoryPage() {
  const router = useRouter()
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    loadRides(0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadRides(pageNum: number) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('rides')
      .select('*, driver:drivers(car_model, car_plate, profile:profiles(full_name))')
      .eq('customer_id', user.id)
      .in('status', ['completed', 'cancelled'])
      .order('requested_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE - 1)

    const rows = (data ?? []) as Ride[]
    setRides(prev => pageNum === 0 ? rows : [...prev, ...rows])
    setHasMore(rows.length === PAGE_SIZE)
    setLoading(false)
  }

  function loadMore() {
    const next = page + 1
    setPage(next)
    loadRides(next)
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/customer/dashboard')} className="text-taxi-muted hover:text-white">←</button>
        <h1 className="text-xl font-bold">Ride History</h1>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-taxi-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && rides.length === 0 && (
        <div className="text-center py-12">
          <p className="text-taxi-muted">No completed rides yet.</p>
          <button
            onClick={() => router.push('/customer/request')}
            className="mt-4 bg-taxi-yellow text-black font-bold px-6 py-3 rounded-xl"
          >
            Request your first ride
          </button>
        </div>
      )}

      <div className="space-y-3">
        {rides.map(ride => (
          <RideCard
            key={ride.id}
            ride={ride}
            onClick={() => router.push(`/customer/ride/${ride.id}`)}
          />
        ))}
      </div>

      {hasMore && !loading && (
        <button
          onClick={loadMore}
          className="mt-6 w-full border border-taxi-border text-taxi-muted py-3 rounded-xl text-sm hover:text-white hover:border-taxi-yellow transition"
        >
          Load more
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Customer profile page**

Create `app/(customer)/profile/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export default function CustomerProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setFullName(data.full_name ?? '')
        setPhone(data.phone ?? '')
      }
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/customer/dashboard')} className="text-taxi-muted hover:text-white">←</button>
        <h1 className="text-xl font-bold">Profile</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-taxi-yellow text-black font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(customer)/history/ app/(customer)/profile/
git commit -m "feat: customer ride history and profile pages"
```

---

## Task 2: Ride history — driver

**Files:**
- Create: `app/(driver)/history/page.tsx`
- Create: `app/(driver)/profile/page.tsx`

- [ ] **Step 1: Driver history page**

Create `app/(driver)/history/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RideStatusBadge } from '@/components/RideStatusBadge'
import { formatPrice } from '@/lib/pricing'
import type { Ride } from '@/lib/types'

export default function DriverHistoryPage() {
  const router = useRouter()
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [totalEarnings, setTotalEarnings] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const { data: driverData } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!driverData) return

      const { data } = await supabase
        .from('rides')
        .select('*, customer:profiles!customer_id(full_name, phone)')
        .eq('driver_id', driverData.id)
        .in('status', ['completed', 'cancelled'])
        .order('requested_at', { ascending: false })
        .limit(50)

      const rows = (data ?? []) as Ride[]
      setRides(rows)
      setTotalEarnings(
        rows.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.final_price ?? 0), 0)
      )
      setLoading(false)
    })
  }, [])

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/driver/dashboard')} className="text-taxi-muted hover:text-white">←</button>
        <h1 className="text-xl font-bold">Ride History</h1>
      </div>

      {!loading && (
        <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-1">Total Earnings</p>
          <p className="text-3xl font-bold text-taxi-yellow">{formatPrice(totalEarnings, 'EUR')}</p>
          <p className="text-taxi-muted text-sm">{rides.filter(r => r.status === 'completed').length} completed rides</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-taxi-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="space-y-3">
        {rides.map(ride => {
          const customer = ride.customer as { full_name?: string } | undefined
          return (
            <div key={ride.id} className="bg-taxi-card border border-taxi-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <RideStatusBadge status={ride.status} />
                <span className="text-taxi-muted text-xs">
                  {new Date(ride.requested_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-white">📍 {ride.pickup_address}</p>
              <p className="text-sm text-taxi-muted">→ {ride.destination_address}</p>
              {customer?.full_name && (
                <p className="text-xs text-taxi-muted mt-1">Customer: {customer.full_name}</p>
              )}
              {ride.final_price && (
                <p className="text-taxi-yellow font-bold mt-2">{formatPrice(ride.final_price, 'EUR')}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Driver profile page**

Create `app/(driver)/profile/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Driver } from '@/lib/types'

export default function DriverProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [carModel, setCarModel] = useState('')
  const [carPlate, setCarPlate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const [{ data: p }, { data: d }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('drivers').select('*').eq('user_id', user.id).single(),
      ])
      if (p) { setProfile(p); setFullName(p.full_name ?? ''); setPhone(p.phone ?? '') }
      if (d) { setDriver(d); setCarModel(d.car_model ?? ''); setCarPlate(d.car_plate ?? '') }
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !driver) return
    setSaving(true)
    const supabase = createClient()
    await Promise.all([
      supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', profile.id),
      supabase.from('drivers').update({ car_model: carModel, car_plate: carPlate }).eq('id', driver.id),
    ])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/driver/dashboard')} className="text-taxi-muted hover:text-white">←</button>
        <h1 className="text-xl font-bold">Profile</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Full Name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Phone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Car Model</label>
          <input type="text" value={carModel} onChange={e => setCarModel(e.target.value)}
            placeholder="e.g. Škoda Octavia"
            className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">License Plate</label>
          <input type="text" value={carPlate} onChange={e => setCarPlate(e.target.value)}
            placeholder="e.g. BG 123-AB"
            className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
        </div>
        <button type="submit" disabled={saving}
          className="w-full bg-taxi-yellow text-black font-bold py-3 rounded-xl disabled:opacity-50">
          {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(driver)/history/ app/(driver)/profile/
git commit -m "feat: driver history with earnings summary and profile page"
```

---

## Task 3: Dispatcher manual ride creation

**Files:**
- Create: `components/CreateRideModal.tsx`
- Modify: `app/(dispatcher)/dashboard/page.tsx` (wire modal to + NEW button)

- [ ] **Step 1: Create modal**

Create `components/CreateRideModal.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { geocodeAddress, getDistanceKm } from '@/lib/mapbox'
import { estimateFare, formatPrice } from '@/lib/pricing'
import type { CompanySettings } from '@/lib/types'
import type { GeocodingFeature } from '@/lib/mapbox'

interface CreateRideModalProps {
  onClose: () => void
  onCreated: () => void
}

export function CreateRideModal({ onClose, onCreated }: CreateRideModalProps) {
  const [customerPhone, setCustomerPhone] = useState('')
  const [pickup, setPickup] = useState('')
  const [destination, setDestination] = useState('')
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [pickupSuggestions, setPickupSuggestions] = useState<GeocodingFeature[]>([])
  const [destSuggestions, setDestSuggestions] = useState<GeocodingFeature[]>([])
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('company_settings').select('*').single().then(({ data }) => setSettings(data))
  }, [])

  // Debounced pickup search
  useEffect(() => {
    const t = setTimeout(async () => {
      setPickupSuggestions(await geocodeAddress(pickup))
    }, 300)
    return () => clearTimeout(t)
  }, [pickup])

  // Debounced destination search
  useEffect(() => {
    const t = setTimeout(async () => {
      setDestSuggestions(await geocodeAddress(destination))
    }, 300)
    return () => clearTimeout(t)
  }, [destination])

  // Fetch distance when both coords are set
  useEffect(() => {
    if (!pickupCoords || !destCoords) return
    getDistanceKm(pickupCoords, destCoords).then(setDistanceKm)
  }, [pickupCoords, destCoords])

  function selectPickup(f: GeocodingFeature) {
    setPickup(f.place_name)
    setPickupCoords({ lat: f.center[1], lng: f.center[0] })
    setPickupSuggestions([])
  }

  function selectDest(f: GeocodingFeature) {
    setDestination(f.place_name)
    setDestCoords({ lat: f.center[1], lng: f.center[0] })
    setDestSuggestions([])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!pickupCoords || !destCoords || !settings) return
    setLoading(true)
    setError('')

    const supabase = createClient()

    // Find customer by phone (optional)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', customerPhone)
      .eq('role', 'customer')
      .maybeSingle()

    const estimated_price = distanceKm
      ? estimateFare(distanceKm, settings)
      : settings.minimum_fare

    const { error: rideError } = await supabase.from('rides').insert({
      customer_id: profiles?.id ?? null,
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

    if (rideError) {
      setError(rideError.message)
      setLoading(false)
      return
    }

    onCreated()
    onClose()
  }

  const fare = distanceKm && settings ? estimateFare(distanceKm, settings) : null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#151515] border border-taxi-border rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Create Ride</h2>
          <button onClick={onClose} className="text-taxi-muted hover:text-white text-xl">×</button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Customer Phone</label>
            <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
              placeholder="From phone call — optional"
              className="w-full bg-taxi-dark border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow text-sm" />
          </div>

          {/* Pickup with autocomplete */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Pickup</label>
            <div className="relative">
              <input type="text" value={pickup} onChange={e => setPickup(e.target.value)} required
                placeholder="Enter pickup address"
                className="w-full bg-taxi-dark border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow text-sm" />
              {pickupSuggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-[#151515] border border-taxi-border rounded-lg overflow-hidden shadow-xl">
                  {pickupSuggestions.map(f => (
                    <li key={f.id} onClick={() => selectPickup(f)}
                      className="px-4 py-2.5 hover:bg-white/5 cursor-pointer text-sm text-white border-b border-taxi-border last:border-0">
                      {f.place_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Destination with autocomplete */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Destination</label>
            <div className="relative">
              <input type="text" value={destination} onChange={e => setDestination(e.target.value)} required
                placeholder="Enter destination"
                className="w-full bg-taxi-dark border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow text-sm" />
              {destSuggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-[#151515] border border-taxi-border rounded-lg overflow-hidden shadow-xl">
                  {destSuggestions.map(f => (
                    <li key={f.id} onClick={() => selectDest(f)}
                      className="px-4 py-2.5 hover:bg-white/5 cursor-pointer text-sm text-white border-b border-taxi-border last:border-0">
                      {f.place_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Luggage, wheelchair access"
              className="w-full bg-taxi-dark border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow text-sm" />
          </div>

          {fare && settings && (
            <div className="bg-taxi-dark border border-taxi-border rounded-lg p-3">
              <p className="text-xs text-taxi-muted">Estimated fare</p>
              <p className="text-taxi-yellow font-bold text-xl">{formatPrice(fare, settings.currency)}</p>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border border-taxi-border text-taxi-muted py-3 rounded-xl text-sm hover:text-white transition">
              Cancel
            </button>
            <button type="submit" disabled={loading || !pickupCoords || !destCoords}
              className="flex-1 bg-taxi-yellow text-black font-bold py-3 rounded-xl text-sm disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Ride'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire modal to + NEW button in dispatcher dashboard**

In `app/(dispatcher)/dashboard/page.tsx`, add modal state and import. At the top of the component:

```typescript
const [showCreateModal, setShowCreateModal] = useState(false)
```

Replace the `+ NEW` button in the left panel:

```typescript
<button
  onClick={() => setShowCreateModal(true)}
  className="bg-taxi-yellow text-black text-xs font-bold px-2 py-1 rounded"
>
  + NEW
</button>
```

Add the modal just before the closing `</div>` of the component:

```typescript
{showCreateModal && (
  <CreateRideModal
    onClose={() => setShowCreateModal(false)}
    onCreated={() => setShowCreateModal(false)}
  />
)}
```

Add the import at the top:

```typescript
import { CreateRideModal } from '@/components/CreateRideModal'
```

- [ ] **Step 3: Commit**

```bash
git add components/CreateRideModal.tsx app/(dispatcher)/dashboard/page.tsx
git commit -m "feat: dispatcher manual ride creation modal"
```

---

## Task 4: Company settings page

**Files:**
- Create: `app/(dispatcher)/settings/page.tsx`

- [ ] **Step 1: Create settings page**

Create `app/(dispatcher)/settings/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CompanySettings } from '@/lib/types'

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    company_name: '',
    phone: '',
    base_fare: '',
    price_per_km: '',
    minimum_fare: '',
    currency: 'EUR',
    primary_color: '#FFD700',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('company_settings').select('*').single().then(({ data }) => {
      if (!data) return
      setSettings(data)
      setForm({
        company_name: data.company_name,
        phone: data.phone ?? '',
        base_fare: String(data.base_fare),
        price_per_km: String(data.price_per_km),
        minimum_fare: String(data.minimum_fare),
        currency: data.currency,
        primary_color: data.primary_color,
      })
    })
  }, [])

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value })),
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('company_settings').update({
      company_name: form.company_name,
      phone: form.phone || null,
      base_fare: parseFloat(form.base_fare),
      price_per_km: parseFloat(form.price_per_km),
      minimum_fare: parseFloat(form.minimum_fare),
      currency: form.currency,
      primary_color: form.primary_color,
    }).eq('id', settings.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen p-8 max-w-lg">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-6 h-6 bg-taxi-yellow rounded-md" />
        <span className="text-taxi-yellow font-bold tracking-widest text-sm">TAXIBASE</span>
      </div>

      <h1 className="text-2xl font-bold mb-2">Company Settings</h1>
      <p className="text-taxi-muted text-sm mb-8">Configure your taxi company details and pricing.</p>

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company Info</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Company Name</label>
              <input type="text" {...field('company_name')} required
                className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Company Phone</label>
              <input type="tel" {...field('phone')}
                className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Pricing</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Base Fare</label>
              <input type="number" step="0.01" {...field('base_fare')} required
                className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Per KM</label>
              <input type="number" step="0.01" {...field('price_per_km')} required
                className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Minimum Fare</label>
              <input type="number" step="0.01" {...field('minimum_fare')} required
                className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Currency</label>
              <input type="text" {...field('currency')} maxLength={3}
                className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow uppercase" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full bg-taxi-yellow text-black font-bold py-3 rounded-xl disabled:opacity-50">
          {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(dispatcher)/settings/
git commit -m "feat: company settings page with pricing configuration"
```

---

## Task 5: Dispatcher support pages

**Files:**
- Create: `app/(dispatcher)/rides/page.tsx`
- Create: `app/(dispatcher)/drivers/page.tsx`

- [ ] **Step 1: All rides page**

Create `app/(dispatcher)/rides/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RideStatusBadge } from '@/components/RideStatusBadge'
import { formatPrice } from '@/lib/pricing'
import type { Ride } from '@/lib/types'

export default function DispatcherRidesPage() {
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const supabase = createClient()
    let query = supabase
      .from('rides')
      .select('*, customer:profiles!customer_id(full_name, phone), driver:drivers(car_model, car_plate, profile:profiles(full_name))')
      .order('requested_at', { ascending: false })
      .limit(100)

    if (filter !== 'all') query = query.eq('status', filter)

    query.then(({ data }) => {
      setRides((data ?? []) as Ride[])
      setLoading(false)
    })
  }, [filter])

  const FILTERS = ['all', 'requested', 'assigned', 'in_progress', 'completed', 'cancelled']

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">All Rides</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {FILTERS.map(f => (
          <button key={f} onClick={() => { setFilter(f); setLoading(true) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition capitalize ${
              filter === f
                ? 'bg-taxi-yellow text-black'
                : 'bg-taxi-card border border-taxi-border text-taxi-muted hover:text-white'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading && <p className="text-taxi-muted">Loading...</p>}

      <div className="space-y-2">
        {rides.map(ride => {
          const customer = ride.customer as { full_name?: string; phone?: string } | undefined
          const driver = ride.driver as { car_model?: string; profile?: { full_name?: string } } | undefined
          return (
            <div key={ride.id} className="bg-taxi-card border border-taxi-border rounded-xl p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <RideStatusBadge status={ride.status} />
                  <span className="text-taxi-muted text-xs">
                    {new Date(ride.requested_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-white truncate">📍 {ride.pickup_address}</p>
                <p className="text-sm text-taxi-muted truncate">→ {ride.destination_address}</p>
                <div className="flex gap-4 mt-2 text-xs text-taxi-muted">
                  {customer?.full_name && <span>Customer: {customer.full_name}</span>}
                  {driver?.profile?.full_name && <span>Driver: {driver.profile.full_name}</span>}
                </div>
              </div>
              {ride.estimated_price && (
                <p className="text-taxi-yellow font-bold shrink-0">{formatPrice(ride.estimated_price, 'EUR')}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Drivers management page**

Create `app/(dispatcher)/drivers/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DriverStatusBadge } from '@/components/DriverStatusBadge'
import type { Driver } from '@/lib/types'

export default function DispatcherDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('drivers')
      .select('*, profile:profiles(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setDrivers((data ?? []) as Driver[])
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Drivers ({drivers.length})</h1>

      {loading && <p className="text-taxi-muted">Loading...</p>}

      <div className="grid gap-3">
        {drivers.map(driver => (
          <div key={driver.id} className="bg-taxi-card border border-taxi-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-taxi-border flex items-center justify-center font-bold text-white">
              {driver.profile?.full_name?.[0] ?? 'D'}
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">{driver.profile?.full_name ?? 'Unknown'}</p>
              <p className="text-taxi-muted text-sm">{driver.car_model ?? '—'} · {driver.car_plate ?? '—'}</p>
              {driver.profile?.phone && (
                <p className="text-taxi-muted text-xs">{driver.profile.phone}</p>
              )}
            </div>
            <DriverStatusBadge status={driver.status} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(dispatcher)/rides/ app/(dispatcher)/drivers/
git commit -m "feat: dispatcher rides list and drivers management pages"
```

---

## Task 6: PWA configuration

**Files:**
- Modify: `next.config.ts`
- Modify: `public/manifest.json`
- Create: `public/icon-192.png` and `public/icon-512.png` (generate manually or use placeholder)

- [ ] **Step 1: Install next-pwa**

```bash
npm install next-pwa
npm install -D @types/next-pwa
```

- [ ] **Step 2: Update next.config.ts**

```typescript
import type { NextConfig } from 'next'
import withPWA from 'next-pwa'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})(nextConfig)
```

- [ ] **Step 3: Update manifest.json**

Replace `public/manifest.json`:

```json
{
  "name": "TaxiBase",
  "short_name": "TaxiBase",
  "description": "Modern taxi dispatch platform",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0f0f0f",
  "theme_color": "#FFD700",
  "categories": ["transportation", "utilities"],
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 4: Generate PWA icons**

Use any online tool (e.g. https://favicon.io) to generate a 192×192 and 512×512 PNG icon with a yellow `#FFD700` background and a black taxi/car symbol. Save them to `public/icon-192.png` and `public/icon-512.png`.

Alternatively, create minimal placeholder icons using Sharp:

```bash
npm install -D sharp
node -e "
const sharp = require('sharp');
const svg = Buffer.from('<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"512\" height=\"512\"><rect width=\"512\" height=\"512\" fill=\"#FFD700\" rx=\"80\"/><text x=\"256\" y=\"320\" font-size=\"280\" text-anchor=\"middle\" fill=\"#000\">🚕</text></svg>');
sharp(svg).resize(192).png().toFile('public/icon-192.png');
sharp(svg).resize(512).png().toFile('public/icon-512.png');
"
```

- [ ] **Step 5: Build and test PWA**

```bash
npm run build
npm run start
```

Open http://localhost:3000 in Chrome → DevTools → Application → Manifest. Confirm:
- Manifest loaded
- Icons shown
- Display: standalone

On mobile Chrome/Safari: check for "Add to Home Screen" prompt.

- [ ] **Step 6: Commit**

```bash
git add public/ next.config.ts package.json package-lock.json
git commit -m "feat: PWA configuration with manifest and service worker"
```

---

## Task 7: Vercel deployment

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/<your-username>/taxi-dispatch.git
git push -u origin main
```

- [ ] **Step 2: Import project on Vercel**

1. Go to vercel.com → New Project → Import your GitHub repo
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
3. Deploy

- [ ] **Step 3: Verify production deployment**

1. Open your Vercel URL
2. Register customer, driver, dispatcher accounts
3. Run the full demo flow end-to-end on production

- [ ] **Step 4: Add production URL to Supabase Auth allowed URLs**

In Supabase dashboard → Auth → URL Configuration → add your Vercel domain to Site URL and Redirect URLs.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: production deployment complete — TaxiBase MVP"
```

---

## ✅ Plan 4 Complete — MVP Done

The full TaxiBase MVP is now complete:

| Feature | Status |
|---|---|
| Supabase schema + RLS | ✅ Plan 1 |
| Auth + role routing | ✅ Plan 1 |
| Customer ride request + fare estimate | ✅ Plan 2 |
| Dispatcher ride queue + assign driver | ✅ Plan 2 |
| Driver status flow | ✅ Plan 2 |
| Realtime status updates | ✅ Plan 2 |
| Driver GPS beacon | ✅ Plan 3 |
| Dispatcher live map | ✅ Plan 3 |
| Customer driver tracking | ✅ Plan 3 |
| Ride history (all roles) | ✅ Plan 4 |
| Manual ride creation | ✅ Plan 4 |
| Company settings | ✅ Plan 4 |
| PWA install support | ✅ Plan 4 |
| Vercel deployment | ✅ Plan 4 |
