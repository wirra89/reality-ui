# Batch 1 UX Fixes — Design Spec

## Goal

Fix five silent failures and confusing UX states that affect real users today. No new dependencies. All changes are targeted and isolated.

## Architecture

No structural changes. Five surgical edits across three files. All error handling routes through the existing `useToast()` / `showToast()` system already present in the app.

**Files touched:**
- `app/(customer)/customer/ride/[id]/page.tsx` — fixes 1, 3, 4
- `app/(driver)/driver/dashboard/page.tsx` — fix 2
- `app/(driver)/driver/ride/[id]/page.tsx` — fix 5

---

## Fix 1 — Cancel ride failure is silent (customer)

**File:** `app/(customer)/customer/ride/[id]/page.tsx`

**Current behaviour:** `handleCancel()` catches errors and calls `console.error` only. Customer sees nothing; the modal closes regardless of success or failure.

**Fix:**
- Move `setCancelling(false)` into a `finally` block.
- Keep `setShowCancelModal(false)` inside the `try` block (success only — modal stays open on failure so customer can retry).
- Replace `console.error` with `showToast('Failed to cancel ride. Please try again.', 'error')`.

```tsx
async function handleCancel(reason: string) {
  if (!ride) return
  setCancelling(true)
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('rides')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancellation_reason: reason })
      .eq('id', ride.id)
    if (error) throw error
    if (ride.driver_id) {
      await supabase.from('drivers').update({ status: 'online' }).eq('id', ride.driver_id)
    }
    setShowCancelModal(false)
  } catch {
    showToast('Failed to cancel ride. Please try again.', 'error')
  } finally {
    setCancelling(false)
  }
}
```

---

## Fix 2 — Reject ride failure is silent (driver)

**File:** `app/(driver)/driver/dashboard/page.tsx`

**Current behaviour:** `handleReject()` immediately calls `setShowAlert(false)` before the Supabase calls. If either call fails, the alert disappears but the ride is still assigned — driver is in a broken state with no feedback.

**Fix:**
- Add `rejecting` boolean state (disables the reject button during the call).
- Move `setShowAlert(false)` and `lastAlertedRideId.current = null` into the `try` block (success only).
- On catch: call `showToast('Failed to reject ride. Please try again.', 'error')`. Alert remains visible so driver can retry.

```tsx
const [rejecting, setRejecting] = useState(false)

async function handleReject() {
  if (!ride || !driverRecord) return
  setRejecting(true)
  try {
    const supabase = createClient()
    await supabase
      .from('rides')
      .update({ status: 'requested', driver_id: null, assigned_at: null })
      .eq('id', ride.id)
    await supabase
      .from('drivers')
      .update({ status: 'online' })
      .eq('id', driverRecord.id)
    setDriverRecord(prev => prev ? { ...prev, status: 'online' } : null)
    setShowAlert(false)
    lastAlertedRideId.current = null
  } catch {
    showToast('Failed to reject ride. Please try again.', 'error')
  } finally {
    setRejecting(false)
  }
}
```

**Also modify `components/RideRequestAlert.tsx`:** Add a `rejectDisabled?: boolean` prop. When true, disable the Reject button AND skip the auto-reject when the countdown hits 0 (prevents a second simultaneous call). Pass `rejectDisabled={rejecting}` from the dashboard.

```tsx
interface RideRequestAlertProps {
  ride: Ride
  onAccept: () => void
  onReject: () => void
  rejectDisabled?: boolean
}
```

In the countdown effect: `if (seconds <= 0 && !rejectDisabled) { handleReject() }`.
Reject button: `disabled={rejectDisabled}` + `opacity-50` when disabled.

---

## Fix 3 — Wait charge accruing not shown to customer

**File:** `app/(customer)/customer/ride/[id]/page.tsx`

**Current behaviour:** Driver sees wait timer + accruing charge. Customer has no idea they're being charged extra while the driver waits at pickup.

**Fix:**
- Add `waitSeconds` state and an interval that counts up from `ride.arrived_at` when `ride.status === 'arrived'` (same pattern as driver ride page).
- When `waitSeconds > 120` and `settings.wait_charge_per_min > 0`, show a small amber notice in the route card area:

```
⏱ Driver is waiting · Wait charge: +€0.30
```

- The charge shown is `Math.floor(waitSeconds / 60) * settings.wait_charge_per_min` (matches the driver's display).
- `settings` is already available via `useSettings()` which is already imported.
- Only show the notice when `ride.status === 'arrived'`. Clear `waitSeconds` back to 0 when status changes.

```tsx
const [waitSeconds, setWaitSeconds] = useState(0)

useEffect(() => {
  if (ride?.status !== 'arrived') { setWaitSeconds(0); return }
  const base = ride.arrived_at ? new Date(ride.arrived_at).getTime() : Date.now()
  const tick = () => setWaitSeconds(Math.floor((Date.now() - base) / 1000))
  tick()
  const id = setInterval(tick, 1000)
  return () => clearInterval(id)
}, [ride?.status, ride?.arrived_at])
```

UI snippet (inside route card, below fare):
```tsx
{ride.status === 'arrived' && waitSeconds > 120 && (settings?.wait_charge_per_min ?? 0) > 0 && (
  <div className="mt-3 flex items-center gap-2 text-amber-400 text-sm">
    <span>⏱</span>
    <span>
      Driver is waiting · Wait charge: +{formatPrice(Math.floor(waitSeconds / 60) * (settings?.wait_charge_per_min ?? 0), currency)}
    </span>
  </div>
)}
```

---

## Fix 4 — Scheduled ride shows confusing "Requested" status

**File:** `app/(customer)/customer/ride/[id]/page.tsx`

**Current behaviour:** After booking a scheduled ride, customer lands on the ride page and sees status badge "Waiting for driver" with no explanation that the ride is in the future and no driver will be assigned yet.

**Fix:** Show a blue info banner directly below the route card when `ride.scheduled_at` is set and `ride.status === 'requested'`:

```tsx
{ride.scheduled_at && ride.status === 'requested' && (
  <div className="bg-blue-950/40 border border-blue-700/50 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
    <span className="text-blue-400 text-lg">🗓</span>
    <div>
      <p className="text-blue-300 text-sm font-semibold">Scheduled ride</p>
      <p className="text-blue-400/80 text-xs mt-0.5">
        A driver will be assigned on{' '}
        {new Date(ride.scheduled_at).toLocaleString(undefined, {
          weekday: 'short', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })}
      </p>
    </div>
  </div>
)}
```

Place this banner between the route card and the driver info card. The cancel button remains visible — customers can cancel a scheduled ride the same way as any other.

---

## Fix 5 — Driver status button gives no hint about what happens next

**File:** `app/(driver)/driver/ride/[id]/page.tsx`

**Current behaviour:** The large yellow action button shows a label (e.g. "Start Driving to Pickup") but gives no hint about the consequence of tapping it.

**Fix:** Add a `TRANSITION_HINTS` map in the file and render hint text as small muted text below the button:

```tsx
const TRANSITION_HINTS: Partial<Record<string, string>> = {
  assigned:        'Customer will be notified you\'re on the way',
  driver_arriving: 'Starts the wait timer when you arrive',
  arrived:         'Starts the trip and the fare meter',
  in_progress:     'Calculates the final fare and closes the ride',
}
```

```tsx
{transition && (
  <div>
    <button onClick={advanceStatus} disabled={advancing}
      className="w-full bg-taxi-yellow text-black font-bold py-5 rounded-xl text-lg disabled:opacity-50">
      {advancing ? 'Updating...' : transition.label}
    </button>
    {TRANSITION_HINTS[ride.status] && (
      <p className="text-center text-taxi-muted text-xs mt-2">
        {TRANSITION_HINTS[ride.status]}
      </p>
    )}
  </div>
)}
```

---

## What is NOT in scope

- No changes to the `DRIVER_TRANSITIONS` labels themselves.
- No changes to the cancel flow on the dispatcher side (already has error handling).
- No UI changes beyond the five fixes above.
- No database schema changes.

## Testing

Each fix is testable manually:
1. Cancel ride with no network → toast appears, modal stays open
2. Reject ride with no network → toast appears, alert stays visible
3. Driver arrives at pickup and waits 2+ min → customer sees amber notice  
4. Book a scheduled ride → ride page shows blue banner instead of bare "Requested"
5. Open any active driver ride → hint text visible below the yellow action button
