# TaxiBase — App Improvements Design

**Date:** 2026-05-24  
**Scope:** 6 improvements identified in full app audit

---

## 1. Wait Charge Bug Fix (B)

### Problem
`DriverRidePage.advanceStatus()` sets `final_price = estimated_price` when completing a ride. The wait timer is displayed to the driver and the accumulated charge is calculated in the UI, but never persisted. Drivers lose this revenue silently.

### Fix
When `transition.next === 'completed'`, derive wait duration from the already-stored timestamps (`arrived_at` and `started_at` on the ride) rather than from UI state — by the time the driver completes the ride, `waitSeconds` has already reset to 0 because the status moved through `in_progress`.

```
arrivedAt  = ride.arrived_at  ? new Date(ride.arrived_at).getTime()  : null
startedAt  = ride.started_at  ? new Date(ride.started_at).getTime()  : null
waitSecs   = arrivedAt && startedAt ? (startedAt - arrivedAt) / 1000 : 0
waitCharge = waitSecs > 120 ? floor(waitSecs / 60) * waitChargePerMin : 0
final_price = (ride.estimated_price ?? 0) + waitCharge
```

Both `arrived_at` and `started_at` are already written to the DB by earlier status transitions. `waitChargePerMin` is already fetched from `company_settings` in this component.

### Data flow
No schema changes needed. `final_price` is already nullable on `rides`.

---

## 2. Bottom Navigation Bar (A)

### Problem
Customer and driver layouts both have `pb-24` padding reserved for a nav bar, but no `BottomNav` component exists. Navigation is exclusively via `← back` buttons — poor mobile UX.

### Component: `components/BottomNav.tsx`
A fixed-bottom bar with role-aware tabs. Accepts a `role` prop (`'customer' | 'driver'`) and the current `pathname` to highlight the active tab.

**Customer tabs:**
| Icon | Label | Route |
|------|-------|-------|
| 🏠 | Home | `/customer/dashboard` |
| 🚕 | Ride | `/customer/request` |
| 📋 | History | `/customer/history` |
| 👤 | Profile | `/customer/profile` |

**Driver tabs:**
| Icon | Label | Route |
|------|-------|-------|
| 🏠 | Dashboard | `/driver/dashboard` |
| 📋 | History | `/driver/history` |
| 👤 | Profile | `/driver/profile` |

### Integration
- Add `<BottomNav role="customer" />` at the bottom of `app/(customer)/layout.tsx`
- Add `<BottomNav role="driver" />` at the bottom of `app/(driver)/layout.tsx`
- Use `usePathname()` inside the component to derive the active tab

### Edge cases
- Hide nav bar on the active ride page (`/customer/ride/[id]`) to maximise map space — the ride page already has its own back button
- Same for driver ride page (`/driver/ride/[id]`)

---

## 3. Shared Settings Context (E)

### Problem
`company_settings` is queried from Supabase in 8+ components on every page mount:
- `DispatcherDashboard`, `DriverDashboard`, `DriverRidePage`, `CustomerRidePage`, `RequestRidePage`, `DriverHistoryPage`, `DispatcherRidesPage`, `AnalyticsPage`, `SettingsPage`

This creates unnecessary round trips and duplicated error handling.

### Solution: `context/SettingsContext.tsx`
A React context that fetches `company_settings` and `pricing_shifts` once, at the root layout level. Exposes:
```ts
interface SettingsContextValue {
  settings: CompanySettings | null
  shifts: PricingShift[]
  currency: string          // convenience: settings?.currency ?? 'EUR'
  loading: boolean
}
```

### Integration
- Wrap `app/layout.tsx` children in `<SettingsProvider>`
- Each page replaces its `supabase.from('company_settings')...` fetch with `const { currency, settings } = useSettings()`
- `SettingsPage` still writes to Supabase directly, then calls a `refresh()` from context to invalidate

---

## 4. Dispatcher Ride Controls — Reassign & Cancel (C)

### Problem
Once a ride status moves past `requested`, `DispatcherPanel` shows no controls. Dispatchers cannot handle exceptions: unresponsive drivers, wrong assignments, customer requests to cancel.

### Changes to `DispatcherPanel`

**For `assigned` and `driver_arriving` rides — add Reassign:**
1. Show a "Reassign Driver" button
2. On click: expand a driver selector (same sorted-by-distance logic as existing assign flow)
3. On confirm:
   - Set old driver status → `'online'`
   - Set new driver `status` → `'assigned'`
   - Update ride: `driver_id = newDriverId`, `assigned_at = now()`
   - Ride status stays `'assigned'`

**For `requested`, `assigned`, `driver_arriving`, `arrived` rides — add Cancel:**
1. Show a red "Cancel Ride" button
2. On click: confirm dialog (inline, not a modal — dispatcher flow should be fast)
3. On confirm:
   - Update ride: `status = 'cancelled'`, `cancelled_at = now()`, `cancellation_reason = 'dispatcher_cancelled'`
   - If a driver was assigned: set driver `status` → `'online'`

**No changes for `in_progress` or `completed` rides** — cancelling a ride in progress is a business decision left out of scope.

---

## 5. Analytics Improvements (D)

### Problem
Analytics only shows today's hourly chart. No period selector, no revenue trend, no cancellation trend.

### Period selector
Three tabs: **Today** | **This Week** | **This Month**. Selecting a tab re-fetches all data for that range. The existing KPI cards (rides count, revenue, avg rating, cancel rate) already work for any date range — they just need the query date range wired to the selector.

### New sections

**Revenue trend chart** (bar chart, one bar per day)
- X axis: days in selected period (today = hourly, week = daily, month = daily)
- Y axis: revenue (sum of `final_price ?? estimated_price` for completed rides)
- Same CSS bar chart pattern already used for the hourly chart

**Cancellation rate over time** (below revenue chart)
- Line chart showing cancel % per day for the selected period
- Rendered as a simple SVG polyline (no library needed — same approach as the bar chart)

**Top drivers table** already exists — keep as-is, just wire it to the period selector so it reflects the chosen range (currently hardcoded to month).

### No new dependencies
All charts use CSS/SVG like the existing hourly bar chart. No chart library.

---

## 6. Scheduled Rides Management (F)

### Problem
Scheduled rides are stored correctly but invisible. Customer dashboard shows nothing about upcoming rides. Dispatcher queue has no way to filter or identify scheduled rides.

### Customer dashboard
Below the "Active Ride" card (or in its place when there's no active ride), add an "Upcoming" section showing scheduled rides with `status = 'requested'` and `scheduled_at > now()`, ordered by `scheduled_at` ascending, limit 3. Each entry shows the destination and the scheduled time. Tapping navigates to the ride tracking page.

### Dispatcher ride queue
Add a **"Scheduled"** filter tab alongside the existing status filters (`all`, `requested`, `assigned`, etc.). This filters `rides` where `scheduled_at IS NOT NULL AND status = 'requested'`. Scheduled rides in this view show their `scheduled_at` time prominently so dispatchers know when to assign.

---

## Implementation Order

1. **Wait charge bug fix** — isolated, no dependencies, highest business impact
2. **Shared settings context** — foundational; simplifies all subsequent pages
3. **Bottom navigation bar** — self-contained new component
4. **Dispatcher ride controls** — modify `DispatcherPanel` only
5. **Scheduled rides** — customer dashboard widget + dispatcher filter tab
6. **Analytics improvements** — period selector + new chart sections

---

## Out of Scope

- Payment method selection (cash-only is intentional for now)
- Driver deactivation from dispatcher
- Search/filter by customer name in rides list
- Wait charge: the 2-minute free window is kept as-is
