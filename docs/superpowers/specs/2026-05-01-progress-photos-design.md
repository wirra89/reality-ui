# Progress Photos Redesign

**Date:** 2026-05-01  
**Status:** Approved

## Problem

The current progress photo feature has four issues:

1. **Two separate data systems.** Photos added from `ProgressPhotosCard` go into `progress_photos`. Photos added from `ProgressTimeline` go into `progress_entries`. They never appear together and produce duplicate, inconsistent state.
2. **Comparison is static.** The card shows oldest vs. newest as two side-by-side images. There is no interactive comparison and no way to see intermediate photos.
3. **N+1 signed URL fetching.** `getProgressPhotos()` fetches signed URLs one at a time in a sequential loop, causing slow load times as photo count grows.
4. **Timeline polish gaps.** Photo thumbnails in the list are too small (96px), there is no tap-to-fullscreen, and delete has no confirmation.

## Solution

### 1. Data Architecture — Merge into `progress_entries`

Deprecate the `progress_photos` table. All progress photos live in `progress_entries`, which already stores date, weight, mood, note, and phase alongside each photo.

**Migration:** Write a one-time SQL migration that copies all rows from `progress_photos` into `progress_entries` with `weight`, `mood`, `note` set to `null` and `phase` set to `null`. The storage paths already use the same `progress-photos` bucket so no file moves are needed.

After migration, delete the `progress_photos` table and remove `lib/progressPhotos.ts` and `ProgressPhotosCard`'s dependency on it.

**Signed URL fetching fix:** Replace the sequential `for` loop in `getProgressEntries()` with `Promise.all()` so all signed URLs are fetched in parallel.

### 2. ProgressPhotosCard — Slider + Thumbnail Strip

The card renders three states based on photo count:

**0 photos:** Dashed empty-state button — "Add your first check-in · Private, only you can see it". Tapping opens the file picker (with `capture="environment"` for direct camera on mobile).

**1 photo:** The single photo on the left, a dashed "Add now" placeholder on the right with an arrow between them. Tapping the placeholder opens the file picker. "View Progress Timeline →" link at the bottom.

**2+ photos:**
- **Slider hero** (top): A full-width drag slider showing "before" on the left and "after" on the right. A white vertical divider with a `◀▶` handle can be dragged to reveal either side. Labels show the date and "Before" / "After". Default pairing: oldest photo as before, newest as after.
- **Hint text:** "drag ◀▶ to compare · tap photos below to swap"
- **Thumbnail strip** (below slider): A horizontally scrollable row of all photo thumbnails. The "before" selection has a grey dot; the "after" selection has a purple dot. The "before" photo is always locked to the oldest entry and cannot be changed from the card. Tapping any unselected thumbnail sets it as the "after" photo (bumping the previous after to unselected). Tapping the current "after" thumb does nothing. To compare any arbitrary pair of photos, use the Progress Timeline. The `+` thumb at the end of the strip opens the file picker.
- **"+ Add check-in photo"** button below the strip.
- **"View Progress Timeline →"** link at the bottom.

**Slider implementation:** Pure CSS + pointer events. No external library. The before image is full-width; the after image is clipped with `clipPath: inset(0 0 0 X%)` where X is the drag position (0–100). A draggable divider div tracks `pointermove` events. Touch-friendly via `touch-action: none`.

**After upload:** The new entry is prepended to the local photo list optimistically, and the thumbnail strip updates immediately without a full re-fetch.

### 3. Add Photo Flow

- Add `capture="environment"` to all `<input type="file" accept="image/*">` elements so mobile users open the camera directly.
- The quick-add flow from the card (pick photo → done) remains fast. Weight, mood, note, and date can be enriched later via the Timeline.
- The full check-in form in `ProgressTimeline` (date, weight, mood, note, phase) is unchanged.

### 4. ProgressTimeline — Polish

- **Larger thumbnails:** Increase the photo column in the list from `w-24` (96px) to `w-32` (128px) so photos are legible at a glance.
- **Tap-to-fullscreen:** Tapping a photo in the list opens the same fullscreen overlay already used in `ProgressPhotosCard`.
- **Delete confirmation:** Replace the immediate delete on ✕ tap with a two-step flow: first tap shows a small inline "Delete this entry?" prompt with Confirm / Cancel buttons. Confirming triggers the existing `deleteProgressEntry` call.

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260501_merge_progress_photos.sql` | One-time migration: copy `progress_photos` → `progress_entries`, drop `progress_photos` |
| `lib/progressEntries.ts` | Fix N+1: replace sequential loop with `Promise.all` |
| `lib/progressPhotos.ts` | Delete (no longer needed) |
| `components/ProgressPhotosCard.tsx` | Full redesign: slider, thumbnail strip, new states. Prop type changes from `photos: ProgressPhoto[]` to `photos: ProgressEntry[]` |
| `components/ProgressTimeline.tsx` | Larger thumbnails, tap-to-fullscreen, delete confirmation |
| `app/profile/page.tsx` | Remove `getProgressPhotos` import and `ProgressPhoto` type; use `getProgressEntries` + `ProgressEntry[]` throughout |

## Out of Scope

- Body measurements (chest, waist, hips) — separate feature
- Swipe-to-delete gesture in timeline — delete confirmation covers the safety need
- Photo editing or filters
- Sharing photos externally
