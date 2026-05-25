# TaxiBase App Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix wait-charge bug, add shared settings context, bottom nav, dispatcher reassign/cancel, scheduled rides views, and analytics period selector with trend charts.

**Architecture:** Work in order — the settings context (Task 2–3) simplifies every subsequent page. The bug fix (Task 1) is self-contained and can go first. All UI work builds on the cleaned-up pages.

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase JS v2, Tailwind CSS, TypeScript. Tests with Jest + `@testing-library/react`. Run tests with `npx jest --testPathPattern=<file>`.

---

## File Map

| File | Action | Task |
|------|--------|------|
| `lib/pricing.ts` | Add `calculateWaitCharge()` | 1 |
| `lib/pricing.test.ts` | Add wait-charge tests | 1 |
| `app/(driver)/driver/ride/[id]/page.tsx` | Use `calculateWaitCharge` in `advanceStatus` | 1 |
| `context/SettingsContext.tsx` | Create — global settings + currency | 2 |
| `app/layout.tsx` | Wrap with `SettingsProvider` | 2 |
| `app/(customer)/customer/request/page.tsx` | Use `useSettings()` | 3 |
| `app/(customer)/customer/ride/[id]/page.tsx` | Use `useSettings()` | 3 |
| `app/(driver)/driver/dashboard/page.tsx` | Use `useSettings()` | 3 |
| `app/(driver)/driver/ride/[id]/page.tsx` | Use `useSettings()` (already touched in Task 1) | 3 |
| `app/(driver)/driver/history/page.tsx` | Use `useSettings()` | 3 |
| `app/(dispatcher)/dispatcher/dashboard/page.tsx` | Use `useSettings()` | 3 |
| `app/(dispatcher)/dispatcher/rides/page.tsx` | Use `useSettings()` | 3 |
| `app/(dispatcher)/dispatcher/analytics/page.tsx` | Use `useSettings()` | 3 |
| `app/(dispatcher)/dispatcher/settings/page.tsx` | Use `useSettings()` + call `refresh()` after save | 3 |
| `components/BottomNav.tsx` | Create — role-aware fixed nav bar | 4 |
| `app/(customer)/layout.tsx` | Add `<BottomNav role="customer" />` | 4 |
| `app/(driver)/layout.tsx` | Add `<BottomNav role="driver" />` | 4 |
| `components/DispatcherPanel.tsx` | Add reassign + cancel controls | 5 |
| `app/(customer)/customer/dashboard/page.tsx` | Add upcoming scheduled rides widget | 6 |
| `app/(dispatcher)/dispatcher/rides/page.tsx` | Add Scheduled filter tab | 6 |
| `app/(dispatcher)/dispatcher/analytics/page.tsx` | Period selector + revenue + cancel trend charts | 7 |

---

## Task 1: Wait Charge Bug Fix

**Files:**
- Modify: `lib/pricing.ts`
- Modify: `lib/pricing.test.ts`
- Modify: `app/(driver)/driver/ride/[id]/page.tsx`

- [ ] **Step 1: Add `calculateWaitCharge` to `lib/pricing.ts`**

Append after the existing `getActiveFareSettings` function:

```ts
export function calculateWaitCharge(
  arrivedAt: string | null,
  startedAt: string | null,
  chargePerMin: number
): number {
  if (!arrivedAt || !startedAt) return 0
  const waitSecs = (new Date(startedAt).getTime() - new Date(arrivedAt).getTime()) / 1000
  if (waitSecs <= 120) return 0
  return Math.floor(waitSecs / 60) * chargePerMin
}
```

- [ ] **Step 2: Write failing tests in `lib/pricing.test.ts`**

Append after the existing `estimateFare` describe block:

```ts
import { estimateFare, calculateWaitCharge } from './pricing'

// ... existing estimateFare tests ...

describe('calculateWaitCharge', () => {
  const base = new Date('2024-01-01T10:00:00Z').getTime()
  const ts = (offsetSecs: number) => new Date(base + offsetSecs * 1000).toISOString()

  it('returns 0 when arrivedAt is null', () => {
    expect(calculateWaitCharge(null, ts(300), 0.10)).toBe(0)
  })

  it('returns 0 when startedAt is null', () => {
    expect(calculateWaitCharge(ts(0), null, 0.10)).toBe(0)
  })

  it('returns 0 within 2-minute free window (exactly 120 s)', () => {
    expect(calculateWaitCharge(ts(0), ts(120), 0.10)).toBe(0)
  })

  it('charges per full minute beyond 2 min free window', () => {
    // 5 min wait → 5 full minutes × 0.10 = 0.50
    expect(calculateWaitCharge(ts(0), ts(300), 0.10)).toBeCloseTo(0.50)
  })

  it('uses floor for partial minutes', () => {
    // 3 min 59 s → 3 full minutes × 0.10 = 0.30
    expect(calculateWaitCharge(ts(0), ts(239), 0.10)).toBeCloseTo(0.30)
  })

  it('returns 0 when wait is exactly 0 seconds', () => {
    expect(calculateWaitCharge(ts(0), ts(0), 0.10)).toBe(0)
  })
})
```

- [ ] **Step 3: Run tests — expect FAIL on calculateWaitCharge tests**

```
npx jest --testPathPattern=lib/pricing.test --no-coverage
```

Expected: `estimateFare` tests pass, `calculateWaitCharge` tests fail with "not a function".

- [ ] **Step 4: Verify tests pass after Step 1**

```
npx jest --testPathPattern=lib/pricing.test --no-coverage
```

Expected: all 10 tests green.

- [ ] **Step 5: Fix `advanceStatus` in `app/(driver)/driver/ride/[id]/page.tsx`**

Add the import at the top of the file (alongside existing `formatPrice` import):

```ts
import { formatPrice, calculateWaitCharge } from '@/lib/pricing'
```

Find the `advanceStatus` function. Replace the block that sets `final_price`:

```ts
// BEFORE:
if (transition.next === 'completed') { updates.completed_at = now; updates.final_price = ride.estimated_price }

// AFTER:
if (transition.next === 'completed') {
  updates.completed_at = now
  const waitCharge = calculateWaitCharge(ride.arrived_at, ride.started_at, waitChargePerMin)
  updates.final_price = (ride.estimated_price ?? 0) + waitCharge
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/pricing.ts lib/pricing.test.ts "app/(driver)/driver/ride/[id]/page.tsx"
git commit -m "fix: apply wait charge to final_price when completing ride"
```

---

## Task 2: Shared Settings Context

**Files:**
- Create: `context/SettingsContext.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `context/SettingsContext.tsx`**

```tsx
'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CompanySettings, PricingShift } from '@/lib/types'

interface SettingsContextValue {
  settings: CompanySettings | null
  shifts: PricingShift[]
  currency: string
  loading: boolean
  refresh: () => void
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: null,
  shifts: [],
  currency: 'EUR',
  loading: true,
  refresh: () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [shifts, setShifts] = useState<PricingShift[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: cs }, { data: ps }] = await Promise.all([
      supabase.from('company_settings').select('*').single(),
      supabase.from('pricing_shifts').select('*').order('shift'),
    ])
    if (cs) setSettings(cs as CompanySettings)
    if (ps) setShifts(ps as PricingShift[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <SettingsContext.Provider value={{
      settings,
      shifts,
      currency: settings?.currency ?? 'EUR',
      loading,
      refresh: load,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
```

- [ ] **Step 2: Wrap root layout in `app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/context/ToastContext'
import { SettingsProvider } from '@/context/SettingsContext'
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
        <ToastProvider>
          <SettingsProvider>
            {children}
          </SettingsProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verify dev server still starts cleanly**

```
# Check the running dev server output — no red errors
```

- [ ] **Step 4: Commit**

```bash
git add context/SettingsContext.tsx app/layout.tsx
git commit -m "feat: add shared SettingsContext for company_settings"
```

---

## Task 3: Refactor Pages to useSettings()

**Files:** 9 pages — remove per-page `company_settings` fetches.

The pattern for every page below is the same:
1. Add `import { useSettings } from '@/context/SettingsContext'`
2. Add `const { currency, settings, shifts } = useSettings()` at the top of the component (take only what the page uses)
3. Remove the `useState` for `currency` / `settings` / `shifts`
4. Remove the `useEffect` that fetched `company_settings` (and `pricing_shifts` where applicable)

- [ ] **Step 1: Refactor `app/(customer)/customer/request/page.tsx`**

Remove:
```ts
// DELETE these lines:
const [settings, setSettings] = useState<CompanySettings | null>(null)
const [shifts, setShifts] = useState<PricingShift[]>([])

// DELETE this effect:
useEffect(() => {
  const supabase = createClient()
  Promise.all([
    supabase.from('company_settings').select('*').single(),
    supabase.from('pricing_shifts').select('*').order('shift'),
  ]).then(([{ data: cs }, { data: ps }]) => {
    if (cs) setSettings(cs)
    if (ps) setShifts(ps as PricingShift[])
  })
}, [])
```

Add after the existing `useState` declarations:
```ts
import { useSettings } from '@/context/SettingsContext'
// inside component:
const { settings, shifts } = useSettings()
```

- [ ] **Step 2: Refactor `app/(customer)/customer/ride/[id]/page.tsx`**

Remove:
```ts
// DELETE:
const [currency, setCurrency] = useState('EUR')

// DELETE this effect block (the currency fetch part only — keep the ride fetch):
supabase.from('company_settings').select('currency').limit(1).single().then(({ data: s }) => {
  if (s?.currency) setCurrency(s.currency)
})
```

Add:
```ts
import { useSettings } from '@/context/SettingsContext'
// inside component:
const { currency } = useSettings()
```

- [ ] **Step 3: Refactor `app/(driver)/driver/dashboard/page.tsx`**

Remove:
```ts
// DELETE:
const [currency, setCurrency] = useState('EUR')

// DELETE from the useEffect:
supabase.from('company_settings').select('currency').limit(1).single().then(({ data: s }) => {
  if (s?.currency) setCurrency(s.currency)
})
```

Add:
```ts
import { useSettings } from '@/context/SettingsContext'
// inside component:
const { currency } = useSettings()
```

- [ ] **Step 4: Refactor `app/(driver)/driver/ride/[id]/page.tsx`**

This file was already edited in Task 1. Now remove the settings fetch and `waitChargePerMin` state — get them from context instead.

Remove:
```ts
// DELETE:
const [currency, setCurrency] = useState('EUR')
const [waitChargePerMin, setWaitChargePerMin] = useState(0.10)

// DELETE from the useEffect:
supabase.from('company_settings').select('currency,wait_charge_per_min').limit(1).single().then(({ data: s }) => {
  if (s?.currency) setCurrency(s.currency)
  if (s?.wait_charge_per_min != null) setWaitChargePerMin(s.wait_charge_per_min)
})
```

Add:
```ts
import { useSettings } from '@/context/SettingsContext'
// inside component:
const { currency, settings } = useSettings()
const waitChargePerMin = settings?.wait_charge_per_min ?? 0.10
```

- [ ] **Step 5: Refactor `app/(driver)/driver/history/page.tsx`**

Remove:
```ts
// DELETE:
const [currency, setCurrency] = useState('EUR')

// DELETE:
supabase.from('company_settings').select('currency').limit(1).single().then(({ data: s }) => {
  if (s?.currency) setCurrency(s.currency)
})
```

Add:
```ts
import { useSettings } from '@/context/SettingsContext'
// inside component:
const { currency } = useSettings()
```

- [ ] **Step 6: Refactor `app/(dispatcher)/dispatcher/dashboard/page.tsx`**

Remove:
```ts
// DELETE:
const [currency, setCurrency] = useState('EUR')

// DELETE this useEffect:
useEffect(() => {
  const supabase = createClient()
  supabase.from('company_settings').select('currency').limit(1).single().then(({ data: s }) => {
    if (s?.currency) setCurrency(s.currency)
  })
}, [])
```

Add:
```ts
import { useSettings } from '@/context/SettingsContext'
// inside component:
const { currency } = useSettings()
```

Pass `currency` down to `<DispatcherPanel>` — it already accepts a `currency` prop.

- [ ] **Step 7: Refactor `app/(dispatcher)/dispatcher/rides/page.tsx`**

Remove:
```ts
// DELETE:
const [currency, setCurrency] = useState('EUR')

// DELETE from the useEffect:
supabase.from('company_settings').select('currency').limit(1).single().then(({ data: s }) => {
  if (s?.currency) setCurrency(s.currency)
})
```

Add:
```ts
import { useSettings } from '@/context/SettingsContext'
// inside component:
const { currency } = useSettings()
```

- [ ] **Step 8: Refactor `app/(dispatcher)/dispatcher/analytics/page.tsx`**

Remove:
```ts
// DELETE:
const [currency, setCurrency] = useState('EUR')

// DELETE from the load() function:
supabase.from('company_settings').select('currency').limit(1).single().then(({ data: s }) => {
  if (s?.currency) setCurrency(s.currency)
})
```

Add:
```ts
import { useSettings } from '@/context/SettingsContext'
// inside component, before load():
const { currency } = useSettings()
```

- [ ] **Step 9: Refactor `app/(dispatcher)/dispatcher/settings/page.tsx`**

Remove:
```ts
// DELETE:
const [settings, setSettings] = useState<CompanySettings | null>(null)
// Keep local form state (form, shifts) — those are needed for editing.

// DELETE from the useEffect:
supabase.from('company_settings').select('*').single()
// (the pricing_shifts fetch can stay for now since it populates local form state)
```

Wait — the settings page needs its own local copy of settings for the form. Keep the `useEffect` for loading form values, but source the initial `settings` object from context and call `refresh()` after saving.

Replace the existing useEffect:
```ts
import { useSettings } from '@/context/SettingsContext'
// inside component:
const { settings, shifts: contextShifts, refresh } = useSettings()

// Replace the existing load useEffect with one that seeds form from context:
useEffect(() => {
  if (!settings) return
  setForm({
    company_name: settings.company_name,
    phone: settings.phone ?? '',
    currency: settings.currency,
    primary_color: settings.primary_color,
    wait_charge_per_min: String(settings.wait_charge_per_min ?? 0.10),
  })
}, [settings])

useEffect(() => {
  if (!contextShifts.length) return
  setShifts(contextShifts.map((s) => ({
    base_fare:    String(s.base_fare),
    price_per_km: String(s.price_per_km),
    minimum_fare: String(s.minimum_fare),
  })))
}, [contextShifts])
```

At the end of `handleSave`, after the success path, add:
```ts
refresh()
```

- [ ] **Step 10: Commit**

```bash
git add \
  "app/(customer)/customer/request/page.tsx" \
  "app/(customer)/customer/ride/[id]/page.tsx" \
  "app/(driver)/driver/dashboard/page.tsx" \
  "app/(driver)/driver/ride/[id]/page.tsx" \
  "app/(driver)/driver/history/page.tsx" \
  "app/(dispatcher)/dispatcher/dashboard/page.tsx" \
  "app/(dispatcher)/dispatcher/rides/page.tsx" \
  "app/(dispatcher)/dispatcher/analytics/page.tsx" \
  "app/(dispatcher)/dispatcher/settings/page.tsx"
git commit -m "refactor: replace per-page company_settings fetches with useSettings()"
```

---

## Task 4: Bottom Navigation Bar

**Files:**
- Create: `components/BottomNav.tsx`
- Modify: `app/(customer)/layout.tsx`
- Modify: `app/(driver)/layout.tsx`

- [ ] **Step 1: Create `components/BottomNav.tsx`**

```tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'

type Role = 'customer' | 'driver'

interface Tab {
  icon: string
  label: string
  href: string
}

const CUSTOMER_TABS: Tab[] = [
  { icon: '🏠', label: 'Home',    href: '/customer/dashboard' },
  { icon: '🚕', label: 'Ride',    href: '/customer/request' },
  { icon: '📋', label: 'History', href: '/customer/history' },
  { icon: '👤', label: 'Profile', href: '/customer/profile' },
]

const DRIVER_TABS: Tab[] = [
  { icon: '🏠', label: 'Dashboard', href: '/driver/dashboard' },
  { icon: '📋', label: 'History',   href: '/driver/history' },
  { icon: '👤', label: 'Profile',   href: '/driver/profile' },
]

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const router = useRouter()

  // Hide on active ride pages — they need full screen
  if (pathname.includes('/ride/')) return null

  const tabs = role === 'customer' ? CUSTOMER_TABS : DRIVER_TABS

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40">
      <div className="max-w-md mx-auto bg-[#151515] border-t border-taxi-border">
        <div className="flex">
          {tabs.map(tab => {
            const active = pathname === tab.href
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
                  active ? 'text-taxi-yellow' : 'text-taxi-muted hover:text-white'
                }`}
              >
                <span className="text-xl leading-none">{tab.icon}</span>
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Add to `app/(customer)/layout.tsx`**

```tsx
import { RoleGuard } from '@/components/RoleGuard'
import { BottomNav } from '@/components/BottomNav'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['customer']}>
      <div className="min-h-screen max-w-md mx-auto">
        {children}
        <BottomNav role="customer" />
      </div>
    </RoleGuard>
  )
}
```

- [ ] **Step 3: Add to `app/(driver)/layout.tsx`**

```tsx
import { RoleGuard } from '@/components/RoleGuard'
import { BottomNav } from '@/components/BottomNav'

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['driver']}>
      <div className="min-h-screen max-w-md mx-auto">
        {children}
        <BottomNav role="driver" />
      </div>
    </RoleGuard>
  )
}
```

- [ ] **Step 4: Remove sign-out buttons from customer and driver dashboards**

The sign-out button in `app/(customer)/customer/dashboard/page.tsx` was in the header because there was no nav. Now profile handles sign-out. Remove:
```tsx
// DELETE from CustomerDashboard:
<button onClick={handleSignOut} className="text-taxi-muted text-sm hover:text-white">Sign out</button>
// and the handleSignOut function
```

Same in `app/(driver)/driver/dashboard/page.tsx` — move sign-out to the profile page only (profile pages already have their own save flow; add a sign-out button there). Add to `app/(customer)/customer/profile/page.tsx` and `app/(driver)/driver/profile/page.tsx` at the bottom of the form:

```tsx
// Add signOut function to profile pages:
async function handleSignOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  window.location.href = '/login'
}

// Add button at bottom of profile page, after the save button:
<button
  type="button"
  onClick={handleSignOut}
  className="w-full border border-taxi-border text-taxi-muted py-3 rounded-xl text-sm hover:text-red-400 hover:border-red-800 transition mt-2"
>
  Sign out
</button>
```

For the driver profile page, set driver status to offline first:
```tsx
async function handleSignOut() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: d } = await supabase.from('drivers').select('id').eq('user_id', user.id).single()
    if (d) await supabase.from('drivers').update({ status: 'offline' }).eq('id', d.id)
  }
  await supabase.auth.signOut()
  window.location.href = '/login'
}
```

- [ ] **Step 5: Commit**

```bash
git add components/BottomNav.tsx "app/(customer)/layout.tsx" "app/(driver)/layout.tsx" \
  "app/(customer)/customer/dashboard/page.tsx" "app/(driver)/driver/dashboard/page.tsx" \
  "app/(customer)/customer/profile/page.tsx" "app/(driver)/driver/profile/page.tsx"
git commit -m "feat: add bottom navigation bar for customer and driver"
```

---

## Task 5: Dispatcher Reassign + Cancel

**Files:**
- Modify: `components/DispatcherPanel.tsx`

- [ ] **Step 1: Replace `DispatcherPanel.tsx` with updated version**

The full updated file — adds `showReassign`, `showCancelConfirm`, `cancelling` state, `reassignDriver()` and `cancelRide()` functions, and the UI controls:

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RideStatusBadge } from './RideStatusBadge'
import { formatPrice } from '@/lib/pricing'
import type { Ride, Driver } from '@/lib/types'

interface DispatcherPanelProps {
  ride: Ride | null
  drivers: Driver[]
  currency?: string
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function DispatcherPanel({ ride, drivers, currency = 'EUR' }: DispatcherPanelProps) {
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [fareOverride, setFareOverride] = useState('')
  const [showReassign, setShowReassign] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  async function assignDriver() {
    if (!ride || !selectedDriverId) return
    setAssigning(true)
    setAssignError('')
    try {
      const supabase = createClient()
      const updates: Record<string, unknown> = {
        driver_id: selectedDriverId,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
      }
      if (fareOverride && !isNaN(Number(fareOverride))) {
        updates.estimated_price = Number(fareOverride)
      }
      const { error: rideErr } = await supabase.from('rides').update(updates).eq('id', ride.id)
      if (rideErr) throw rideErr
      const { error: driverErr } = await supabase.from('drivers').update({ status: 'assigned' }).eq('id', selectedDriverId)
      if (driverErr) throw driverErr
      setSelectedDriverId('')
      setFareOverride('')
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : 'Assignment failed')
    } finally {
      setAssigning(false)
    }
  }

  async function reassignDriver() {
    if (!ride || !selectedDriverId) return
    setAssigning(true)
    setAssignError('')
    try {
      const supabase = createClient()
      if (ride.driver_id) {
        await supabase.from('drivers').update({ status: 'online' }).eq('id', ride.driver_id)
      }
      const { error: rideErr } = await supabase.from('rides').update({
        driver_id: selectedDriverId,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
      }).eq('id', ride.id)
      if (rideErr) throw rideErr
      const { error: driverErr } = await supabase.from('drivers').update({ status: 'assigned' }).eq('id', selectedDriverId)
      if (driverErr) throw driverErr
      setShowReassign(false)
      setSelectedDriverId('')
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : 'Reassign failed')
    } finally {
      setAssigning(false)
    }
  }

  async function cancelRide() {
    if (!ride) return
    setCancelling(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('rides').update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'dispatcher_cancelled',
      }).eq('id', ride.id)
      if (error) throw error
      if (ride.driver_id) {
        await supabase.from('drivers').update({ status: 'online' }).eq('id', ride.driver_id)
      }
      setShowCancelConfirm(false)
    } catch (err) {
      console.error('Cancel ride failed:', err)
    } finally {
      setCancelling(false)
    }
  }

  if (!ride) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <p className="text-taxi-muted text-xs text-center">Select a ride from the queue</p>
      </div>
    )
  }

  const customer = ride.customer as { full_name?: string; phone?: string } | undefined

  const driversWithDist = drivers
    .filter(d => ['online', 'waiting'].includes(d.status))
    .map(d => ({
      ...d,
      dist: ride.pickup_lat && ride.pickup_lng && d.current_lat && d.current_lng
        ? haversineKm(d.current_lat, d.current_lng, ride.pickup_lat, ride.pickup_lng)
        : null,
    }))
    .sort((a, b) => (a.dist ?? 9999) - (b.dist ?? 9999))

  const nearestDriver = driversWithDist[0]

  const canCancel = ['requested', 'assigned', 'driver_arriving', 'arrived'].includes(ride.status)
  const canReassign = ['assigned', 'driver_arriving'].includes(ride.status)

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
          <a href={`tel:${customer.phone}`} className="text-xs text-green-400 mt-1 block">{customer.phone}</a>
        )}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-taxi-muted mb-2">Route</p>
        <p className="text-xs text-white">📍 {ride.pickup_address}</p>
        <p className="text-xs text-taxi-muted mt-1">→ {ride.destination_address}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-taxi-muted mb-1">Fare</p>
        <div className="flex items-center gap-2">
          <p className="text-taxi-yellow font-bold text-lg">
            {fareOverride ? formatPrice(Number(fareOverride), currency) : ride.estimated_price ? formatPrice(ride.estimated_price, currency) : '—'}
          </p>
          {ride.status === 'requested' && (
            <input
              type="number"
              value={fareOverride}
              onChange={e => setFareOverride(e.target.value)}
              placeholder="Override"
              step="0.50"
              min="0"
              className="w-20 bg-[#1a1a1a] border border-taxi-border text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-taxi-yellow"
            />
          )}
        </div>
        <p className="text-xs text-taxi-muted">Cash</p>
      </div>

      {/* Assign — for unassigned rides */}
      {ride.status === 'requested' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs uppercase tracking-wider text-taxi-muted">Assign Driver</p>
            {nearestDriver && nearestDriver.dist != null && (
              <span className="text-xs text-green-400">nearest: {nearestDriver.dist.toFixed(1)} km</span>
            )}
          </div>
          <select value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-taxi-border text-white text-xs rounded-lg px-2 py-2 mb-2 focus:outline-none focus:border-taxi-yellow">
            <option value="">Select driver...</option>
            {driversWithDist.map(d => (
              <option key={d.id} value={d.id}>
                {d.id === nearestDriver?.id ? '★ ' : ''}{d.profile?.full_name ?? 'Driver'} · {d.car_model}
                {d.dist != null ? ` (${d.dist.toFixed(1)} km)` : ''}
              </option>
            ))}
          </select>
          <button onClick={assignDriver} disabled={!selectedDriverId || assigning}
            className="w-full bg-taxi-yellow text-black font-bold py-2 rounded-lg text-xs disabled:opacity-50">
            {assigning ? 'Assigning...' : 'Assign Ride'}
          </button>
          {assignError && <p className="text-red-400 text-xs mt-1">{assignError}</p>}
        </div>
      )}

      {/* Reassign — for in-flight rides */}
      {canReassign && (
        <div>
          {!showReassign ? (
            <button onClick={() => { setShowReassign(true); setSelectedDriverId('') }}
              className="w-full border border-taxi-border text-taxi-muted py-2 rounded-lg text-xs hover:border-taxi-yellow hover:text-white transition">
              ↺ Reassign Driver
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-taxi-muted">Reassign to</p>
              <select value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-taxi-border text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-taxi-yellow">
                <option value="">Select driver...</option>
                {driversWithDist.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.id === nearestDriver?.id ? '★ ' : ''}{d.profile?.full_name ?? 'Driver'} · {d.car_model}
                    {d.dist != null ? ` (${d.dist.toFixed(1)} km)` : ''}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={reassignDriver} disabled={!selectedDriverId || assigning}
                  className="flex-1 bg-taxi-yellow text-black font-bold py-2 rounded-lg text-xs disabled:opacity-50">
                  {assigning ? '...' : 'Reassign'}
                </button>
                <button onClick={() => { setShowReassign(false); setSelectedDriverId('') }}
                  className="border border-taxi-border text-taxi-muted px-3 py-2 rounded-lg text-xs hover:text-white">
                  ✕
                </button>
              </div>
              {assignError && <p className="text-red-400 text-xs">{assignError}</p>}
            </div>
          )}
        </div>
      )}

      {/* Cancel */}
      {canCancel && (
        <div>
          {!showCancelConfirm ? (
            <button onClick={() => setShowCancelConfirm(true)}
              className="w-full border border-red-900 text-red-500 py-2 rounded-lg text-xs hover:bg-red-950/40 transition">
              ✕ Cancel Ride
            </button>
          ) : (
            <div className="border border-red-900 rounded-lg p-3 space-y-2 bg-red-950/20">
              <p className="text-xs text-red-400 font-semibold">Cancel this ride?</p>
              <div className="flex gap-2">
                <button onClick={cancelRide} disabled={cancelling}
                  className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg text-xs disabled:opacity-50">
                  {cancelling ? '...' : 'Yes, cancel'}
                </button>
                <button onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 border border-taxi-border text-taxi-muted py-2 rounded-lg text-xs hover:text-white">
                  No
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {customer?.phone && (
        <a href={`tel:${customer.phone}`}
          className="block w-full text-center border border-taxi-border text-taxi-muted py-2 rounded-lg text-xs hover:border-taxi-yellow hover:text-white transition">
          📞 Call Customer
        </a>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/DispatcherPanel.tsx
git commit -m "feat: add reassign and cancel controls to dispatcher panel"
```

---

## Task 6: Scheduled Rides

**Files:**
- Modify: `app/(customer)/customer/dashboard/page.tsx`
- Modify: `app/(dispatcher)/dispatcher/rides/page.tsx`

- [ ] **Step 1: Add upcoming scheduled rides to customer dashboard**

In `app/(customer)/customer/dashboard/page.tsx`, add state and fetch:

```tsx
// Add import at top:
import type { Ride } from '@/lib/types'

// Add state:
const [scheduledRides, setScheduledRides] = useState<Ride[]>([])

// Inside the existing useEffect (after setUserId(user.id)), add:
const now = new Date().toISOString()
const { data: scheduled } = await supabase
  .from('rides')
  .select('*')
  .eq('customer_id', user.id)
  .eq('status', 'requested')
  .not('scheduled_at', 'is', null)
  .gt('scheduled_at', now)
  .order('scheduled_at', { ascending: true })
  .limit(3)
setScheduledRides((scheduled ?? []) as Ride[])
```

Add the widget in the JSX, after the active-ride card and before the "Request a Taxi" button:

```tsx
{!loading && scheduledRides.length > 0 && (
  <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-6">
    <p className="text-xs uppercase tracking-wider text-taxi-muted mb-3">Upcoming</p>
    <div className="space-y-3">
      {scheduledRides.map(r => (
        <button
          key={r.id}
          onClick={() => router.push(`/customer/ride/${r.id}`)}
          className="w-full flex items-center justify-between text-left hover:opacity-80 transition"
        >
          <div>
            <p className="text-sm text-white truncate max-w-[220px]">→ {r.destination_address}</p>
            <p className="text-xs text-blue-300 mt-0.5">
              {new Date(r.scheduled_at!).toLocaleString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          <span className="text-taxi-muted text-sm">›</span>
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: Add Scheduled filter to dispatcher rides page**

In `app/(dispatcher)/dispatcher/rides/page.tsx`:

Change the FILTERS array:
```ts
const FILTERS = ['all', 'requested', 'assigned', 'in_progress', 'completed', 'cancelled', 'scheduled']
```

Replace the query filter block:
```ts
// BEFORE:
if (filter !== 'all') query = query.eq('status', filter)

// AFTER:
if (filter === 'scheduled') {
  query = query.eq('status', 'requested').not('scheduled_at', 'is', null)
} else if (filter !== 'all') {
  query = query.eq('status', filter)
}
```

Update `handleRideUpdate` to handle the scheduled filter:
```ts
const matches =
  currentFilter === 'all' ||
  (currentFilter === 'scheduled'
    ? updated.scheduled_at != null && updated.status === 'requested'
    : updated.status === currentFilter)
```

Add `scheduled_at` display inside the ride card JSX (after the address lines):
```tsx
{ride.scheduled_at && (
  <span className="text-blue-300 text-xs mt-1 block">
    Scheduled: {new Date(ride.scheduled_at).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })}
  </span>
)}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(customer)/customer/dashboard/page.tsx" "app/(dispatcher)/dispatcher/rides/page.tsx"
git commit -m "feat: add scheduled rides widget (customer dashboard + dispatcher filter)"
```

---

## Task 7: Analytics — Period Selector + Trend Charts

**Files:**
- Modify: `app/(dispatcher)/dispatcher/analytics/page.tsx`

- [ ] **Step 1: Replace analytics page with period-aware version**

The full updated file:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSettings } from '@/context/SettingsContext'
import { formatPrice } from '@/lib/pricing'

type Period = 'today' | 'week' | 'month'

interface TrendPoint {
  label: string
  revenue: number
  count: number
  cancelled: number
}

interface DriverStat {
  name: string
  trips: number
  avg_rating: number | null
  revenue: number
}

interface PeriodStats {
  totalRides: number
  revenue: number
  cancelRate: number
  avgRating: number | null
  trend: TrendPoint[]
  topDrivers: DriverStat[]
}

type RideRow = {
  status: string
  final_price: number | null
  estimated_price: number | null
  customer_rating: number | null
  requested_at: string
}

type DriverRideRow = {
  driver_id: string
  final_price: number | null
  estimated_price: number | null
  customer_rating: number | null
  driver: { profile: { full_name: string | null } | null } | null
}

function periodStart(p: Period): Date {
  const now = new Date()
  if (p === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (p === 'week') return new Date(now.getTime() - 7 * 24 * 3600 * 1000)
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function buildTrend(rides: RideRow[], period: Period): TrendPoint[] {
  const now = new Date()
  if (period === 'today') {
    const map: Record<number, TrendPoint> = {}
    for (let h = 0; h < 24; h++) map[h] = { label: h % 6 === 0 ? `${h}h` : '', revenue: 0, count: 0, cancelled: 0 }
    rides.forEach(r => {
      const h = new Date(r.requested_at).getHours()
      map[h].count++
      if (r.status === 'cancelled') map[h].cancelled++
      if (r.status === 'completed') map[h].revenue += r.final_price ?? r.estimated_price ?? 0
    })
    return Object.values(map)
  }
  if (period === 'week') {
    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const map: Record<string, TrendPoint> = {}
    DAY_LABELS.forEach(l => { map[l] = { label: l, revenue: 0, count: 0, cancelled: 0 } })
    rides.forEach(r => {
      const label = DAY_LABELS[(new Date(r.requested_at).getDay() + 6) % 7]
      map[label].count++
      if (r.status === 'cancelled') map[label].cancelled++
      if (r.status === 'completed') map[label].revenue += r.final_price ?? r.estimated_price ?? 0
    })
    return Object.values(map)
  }
  // month — daily
  const daysInMonth = now.getDate()
  const map: Record<string, TrendPoint> = {}
  for (let d = 1; d <= daysInMonth; d++) map[String(d)] = { label: d % 5 === 1 ? String(d) : '', revenue: 0, count: 0, cancelled: 0 }
  rides.forEach(r => {
    const label = String(new Date(r.requested_at).getDate())
    if (map[label]) {
      map[label].count++
      if (r.status === 'cancelled') map[label].cancelled++
      if (r.status === 'completed') map[label].revenue += r.final_price ?? r.estimated_price ?? 0
    }
  })
  return Object.values(map)
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { currency } = useSettings()
  const [period, setPeriod] = useState<Period>('today')
  const [stats, setStats] = useState<PeriodStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (p: Period) => {
    setLoading(true)
    const supabase = createClient()
    const start = periodStart(p).toISOString()

    const [{ data: rides }, { data: driverRides }] = await Promise.all([
      supabase.from('rides')
        .select('status, final_price, estimated_price, customer_rating, requested_at')
        .gte('requested_at', start),
      supabase.from('rides')
        .select('driver_id, final_price, estimated_price, customer_rating, driver:drivers(profile:profiles(full_name))')
        .eq('status', 'completed')
        .gte('requested_at', start)
        .not('driver_id', 'is', null),
    ])

    const ridesArr = (rides ?? []) as RideRow[]
    const completed = ridesArr.filter(r => r.status === 'completed')
    const cancelled = ridesArr.filter(r => r.status === 'cancelled')
    const revenue = completed.reduce((s, r) => s + (r.final_price ?? r.estimated_price ?? 0), 0)
    const cancelRate = ridesArr.length > 0 ? (cancelled.length / ridesArr.length) * 100 : 0
    const rated = ridesArr.filter(r => r.customer_rating != null)
    const avgRating = rated.length > 0
      ? rated.reduce((s, r) => s + (r.customer_rating as number), 0) / rated.length
      : null

    // Top drivers
    const driverMap = new Map<string, { name: string; trips: number; totalRating: number; ratingCount: number; revenue: number }>()
    ;((driverRides ?? []) as unknown as DriverRideRow[]).forEach(r => {
      const id = r.driver_id
      const name = (r.driver as { profile?: { full_name?: string | null } | null } | null)?.profile?.full_name ?? 'Unknown'
      const ex = driverMap.get(id) ?? { name, trips: 0, totalRating: 0, ratingCount: 0, revenue: 0 }
      ex.trips++
      ex.revenue += r.final_price ?? r.estimated_price ?? 0
      if (r.customer_rating != null) { ex.totalRating += r.customer_rating; ex.ratingCount++ }
      driverMap.set(id, ex)
    })
    const topDrivers: DriverStat[] = Array.from(driverMap.values())
      .sort((a, b) => b.trips - a.trips).slice(0, 5)
      .map(d => ({ name: d.name, trips: d.trips, avg_rating: d.ratingCount > 0 ? d.totalRating / d.ratingCount : null, revenue: d.revenue }))

    setStats({ totalRides: ridesArr.length, revenue, cancelRate, avgRating, trend: buildTrend(ridesArr, p), topDrivers })
    setLoading(false)
  }, [])

  useEffect(() => { load(period) }, [period, load])

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ]

  const maxCount   = stats ? Math.max(...stats.trend.map(t => t.count), 1) : 1
  const maxRevenue = stats ? Math.max(...stats.trend.map(t => t.revenue), 1) : 1
  const maxCancel  = stats ? Math.max(...stats.trend.map(t => t.cancelled), 1) : 1

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/dispatcher/dashboard')} className="text-taxi-muted hover:text-white text-sm">← Dashboard</button>
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      {/* Period selector */}
      <div className="flex rounded-lg overflow-hidden border border-taxi-border mb-8 w-fit">
        {PERIODS.map(({ key, label }) => (
          <button key={key} onClick={() => setPeriod(key)}
            className={`px-5 py-2 text-sm font-semibold transition-colors ${
              period === key ? 'bg-taxi-yellow text-black' : 'bg-taxi-card text-taxi-muted hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-taxi-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {stats && !loading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Rides',    value: String(stats.totalRides),                        sub: period === 'today' ? 'today' : period === 'week' ? 'last 7 days' : 'this month' },
              { label: 'Cancel Rate',    value: `${stats.cancelRate.toFixed(1)}%`,               sub: 'of all rides' },
              { label: 'Revenue',        value: formatPrice(stats.revenue, currency),             sub: period === 'today' ? 'today' : period === 'week' ? 'last 7 days' : 'this month' },
              { label: 'Avg Rating',     value: stats.avgRating != null ? `${stats.avgRating.toFixed(1)} ★` : '—', sub: 'customer rating' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-taxi-card border border-taxi-border rounded-xl p-4">
                <p className="text-xs uppercase tracking-wider text-taxi-muted mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
                <p className="text-xs text-taxi-muted mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Rides trend chart */}
          <div className="bg-taxi-card border border-taxi-border rounded-xl p-6 mb-6">
            <p className="text-xs uppercase tracking-wider text-taxi-muted mb-4">
              Rides — {period === 'today' ? 'By Hour' : 'By Day'}
            </p>
            <div className="flex items-end gap-1 h-28">
              {stats.trend.map((pt, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-taxi-yellow/80 rounded-t"
                    style={{ height: `${(pt.count / maxCount) * 100}%`, minHeight: pt.count > 0 ? '4px' : '0' }}
                    title={`${pt.label || i} — ${pt.count} rides`}
                  />
                  {pt.label && <span className="text-taxi-muted text-xs">{pt.label}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Revenue trend chart */}
          <div className="bg-taxi-card border border-taxi-border rounded-xl p-6 mb-6">
            <p className="text-xs uppercase tracking-wider text-taxi-muted mb-4">
              Revenue — {period === 'today' ? 'By Hour' : 'By Day'}
            </p>
            <div className="flex items-end gap-1 h-28">
              {stats.trend.map((pt, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-green-500/70 rounded-t"
                    style={{ height: `${(pt.revenue / maxRevenue) * 100}%`, minHeight: pt.revenue > 0 ? '4px' : '0' }}
                    title={`${pt.label || i} — ${formatPrice(pt.revenue, currency)}`}
                  />
                  {pt.label && <span className="text-taxi-muted text-xs">{pt.label}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Cancellations trend chart */}
          <div className="bg-taxi-card border border-taxi-border rounded-xl p-6 mb-8">
            <p className="text-xs uppercase tracking-wider text-taxi-muted mb-4">
              Cancellations — {period === 'today' ? 'By Hour' : 'By Day'}
            </p>
            <div className="flex items-end gap-1 h-20">
              {stats.trend.map((pt, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-red-500/60 rounded-t"
                    style={{ height: `${(pt.cancelled / maxCancel) * 100}%`, minHeight: pt.cancelled > 0 ? '4px' : '0' }}
                    title={`${pt.label || i} — ${pt.cancelled} cancelled`}
                  />
                  {pt.label && <span className="text-taxi-muted text-xs">{pt.label}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Top drivers */}
          {stats.topDrivers.length > 0 && (
            <div className="bg-taxi-card border border-taxi-border rounded-xl p-6">
              <p className="text-xs uppercase tracking-wider text-taxi-muted mb-4">Top Drivers</p>
              <div className="space-y-3">
                {stats.topDrivers.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-4">
                    <span className="text-taxi-muted text-sm w-5 text-right">{i + 1}.</span>
                    <span className="text-white font-medium flex-1 truncate">{d.name}</span>
                    <span className="text-taxi-muted text-sm">{d.trips} trips</span>
                    <span className="text-taxi-yellow text-sm w-12 text-right">
                      {d.avg_rating != null ? `${d.avg_rating.toFixed(1)} ★` : '—'}
                    </span>
                    <span className="text-green-400 text-sm w-20 text-right">{formatPrice(d.revenue, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run type check**

```
npx tsc --noEmit
```

Expected: no errors. Fix any type errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add "app/(dispatcher)/dispatcher/analytics/page.tsx"
git commit -m "feat: analytics period selector with revenue and cancellation trend charts"
```

---

## Final Check

- [ ] **Run full test suite**

```
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Smoke test the dev server**

Visit each role's key pages and verify:
- Customer: bottom nav visible, "Upcoming" section shows if scheduled rides exist, active ride tracking works
- Driver: bottom nav visible, completing a ride with wait time produces correct `final_price`
- Dispatcher: reassign button appears on assigned rides, cancel button appears and confirms inline, analytics period tabs change the charts and KPIs

- [ ] **Final commit if any cleanup needed**

```bash
git add -p
git commit -m "chore: post-implementation cleanup"
```
