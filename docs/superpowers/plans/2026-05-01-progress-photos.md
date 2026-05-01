# Progress Photos Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the two photo data systems into one, replace the static side-by-side compare with an interactive drag slider + thumbnail strip, and polish the timeline with larger thumbnails, tap-to-fullscreen, and two-step delete confirmation.

**Architecture:** All progress photos live in `progress_entries` (the richer table). A one-time SQL migration copies existing `progress_photos` rows across, then drops the old table. `ProgressPhotosCard` is fully rewritten to accept `ProgressEntry[]` and render three states (0/1/2+ photos). The slider is a pure CSS + pointer-events implementation — no external library. `ProgressTimeline` gets three targeted UI polish changes. The parent (`app/profile/page.tsx`) switches its import from `getProgressPhotos` to `getProgressEntries` and uses an optimistic prepend instead of re-fetching on upload.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (Postgres + Storage)

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `supabase/migrations/20260501_merge_progress_photos.sql` | **Create** | Copies `progress_photos` → `progress_entries`, drops old table |
| `lib/progressPhotos.ts` | **Delete** | No longer needed after migration |
| `components/ProgressPhotosCard.tsx` | **Rewrite** | New props, three states, drag slider, thumbnail strip, `capture="environment"` |
| `app/profile/page.tsx` | **Modify** | Swap imports, update state type, optimistic `onPhotoAdded`, add `phase` prop |
| `components/ProgressTimeline.tsx` | **Modify** | w-24→w-32, tap-to-fullscreen overlay, two-step delete |

---

## Task 1: Write SQL Migration

**Files:**
- Create: `supabase/migrations/20260501_merge_progress_photos.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Copy all rows from progress_photos into progress_entries.
-- Storage paths already use the same progress-photos bucket — no file moves needed.
-- weight, mood, note, phase are null for migrated rows; they can be enriched later via Timeline.

INSERT INTO progress_entries (id, user_id, date, image_url, weight, mood, note, phase, created_at)
SELECT
  id,
  user_id,
  DATE(taken_at) AS date,
  photo_url      AS image_url,
  NULL           AS weight,
  NULL           AS mood,
  NULL           AS note,
  NULL           AS phase,
  created_at
FROM progress_photos
ON CONFLICT (id) DO NOTHING;

DROP TABLE IF EXISTS progress_photos;
```

Save as `supabase/migrations/20260501_merge_progress_photos.sql`.

- [ ] **Step 2: Verify the file was written correctly**

Read `supabase/migrations/20260501_merge_progress_photos.sql` and confirm:
- `INSERT INTO progress_entries` selects from `progress_photos`
- `ON CONFLICT (id) DO NOTHING` is present (safe to re-run)
- `DROP TABLE IF EXISTS progress_photos` is the last statement

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260501_merge_progress_photos.sql
git commit -m "feat: add migration to merge progress_photos into progress_entries"
```

---

## Task 2: Rewrite ProgressPhotosCard

**Files:**
- Modify: `components/ProgressPhotosCard.tsx`

- [ ] **Step 1: Replace the entire file content**

Write `components/ProgressPhotosCard.tsx` with the following content:

```tsx
"use client";
import { useRef, useState } from "react";
import { type ProgressEntry, createProgressEntry } from "@/lib/progressEntries";

interface ProgressPhotosCardProps {
  photos: ProgressEntry[];           // sorted newest-first (from getProgressEntries)
  phase?: string;                    // current cycle phase, auto-filled on quick upload
  onPhotoAdded: (entry: ProgressEntry) => void;
  onViewTimeline: () => void;
}

function fmtDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-GB", {
    month: "short", year: "numeric",
  });
}

function monthsBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round(Math.abs(db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24 * 30));
}

export default function ProgressPhotosCard({
  photos, phase, onPhotoAdded, onViewTimeline,
}: ProgressPhotosCardProps) {
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const sliderRef     = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [afterIdx, setAfterIdx]       = useState(0);   // index in photos[] for "after"
  const [dragPct, setDragPct]         = useState(50);  // 0–100, slider divider position

  // photos is sorted newest-first, so photos[0]=newest, photos[length-1]=oldest
  const oldest     = photos.length > 0 ? photos[photos.length - 1] : null;
  const beforePhoto = oldest;                           // always locked to oldest
  const afterPhoto  = photos[afterIdx] ?? null;

  // ── Slider pointer events ──────────────────────────────────────────────────
  function calcPct(clientX: number): number {
    if (!sliderRef.current) return 50;
    const rect = sliderRef.current.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setDragPct(calcPct(e.clientX));
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!isDraggingRef.current) return;
    setDragPct(calcPct(e.clientX));
  }
  function onPointerUp() { isDraggingRef.current = false; }

  // ── Upload ─────────────────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setUploadError("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024)   { setUploadError("Image must be under 10 MB.");   return; }
    setUploadError(null);
    setUploading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const entry = await createProgressEntry({ file, date: today, phase: phase ?? null });
      setAfterIdx(0);   // parent will prepend, so new entry lands at index 0
      onPhotoAdded(entry);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="bg-surface rounded-2xl shadow-card mb-3 overflow-hidden"
      style={{ borderTop: "2px solid #A78BFA" }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#A78BFA" }}>
          Progress photos
        </p>
        {photos.length === 1 && (
          <p className="text-xs font-body" style={{ color: "var(--color-text-dim)" }}>1 photo</p>
        )}
        {photos.length >= 2 && oldest && (
          <p className="text-xs font-body" style={{ color: "var(--color-text-dim)" }}>
            {photos.length} photos · {monthsBetween(oldest.date, photos[0].date)} months
          </p>
        )}
      </div>

      {/* ── STATE 0: no photos ────────────────────────────────────────────── */}
      {photos.length === 0 && (
        <div className="px-4 pb-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-8 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-98"
            style={{ border: "1.5px dashed rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.04)" }}
          >
            <span className="text-2xl">📸</span>
            <p className="text-sm font-semibold" style={{ color: "#A78BFA" }}>Add your first check-in</p>
            <p className="text-xs font-body" style={{ color: "var(--color-text-dim)" }}>
              Private · only you can see it
            </p>
          </button>
          {uploadError && (
            <p className="text-xs text-red-400 text-center mt-2">{uploadError}</p>
          )}
        </div>
      )}

      {/* ── STATE 1: one photo ────────────────────────────────────────────── */}
      {photos.length === 1 && oldest && (
        <div className="px-4 pb-4">
          <div className="flex gap-3 items-stretch mb-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <button
                onClick={() => setPreviewUrl(oldest.imageUrl)}
                className="w-full rounded-xl overflow-hidden block transition-all active:scale-98"
                style={{ aspectRatio: "2/3" }}
              >
                <img src={oldest.imageUrl} alt="Progress" className="w-full h-full object-cover" />
              </button>
              <p className="text-center text-xs font-semibold" style={{ color: "var(--color-text-dim)" }}>
                {fmtDate(oldest.date)} · Start
              </p>
            </div>
            <div className="flex items-center px-1" style={{ color: "rgba(0,0,0,0.2)", fontSize: "1.125rem" }}>→</div>
            <div className="flex-1 flex flex-col gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full rounded-xl flex flex-col items-center justify-center gap-2 transition-all active:scale-98"
                style={{
                  aspectRatio: "2/3",
                  border: "1.5px dashed rgba(167,139,250,0.3)",
                  background: "rgba(167,139,250,0.04)",
                }}
              >
                {uploading ? (
                  <span className="text-xs font-semibold" style={{ color: "#A78BFA" }}>Uploading…</span>
                ) : (
                  <>
                    <span style={{ color: "#A78BFA", fontSize: "1.5rem" }}>＋</span>
                    <span className="text-xs font-semibold" style={{ color: "#A78BFA" }}>Add now</span>
                  </>
                )}
              </button>
              <p className="text-center text-xs font-semibold" style={{ color: "rgba(167,139,250,0.5)" }}>
                Add now
              </p>
            </div>
          </div>
          {uploadError && (
            <p className="text-xs text-red-400 text-center mt-2">{uploadError}</p>
          )}
        </div>
      )}

      {/* ── STATE 2+: slider + thumbnail strip ───────────────────────────── */}
      {photos.length >= 2 && beforePhoto && afterPhoto && (
        <>
          {/* Drag slider */}
          <div className="px-4 mb-2">
            <div
              ref={sliderRef}
              className="relative rounded-2xl overflow-hidden"
              style={{ height: 200, cursor: "ew-resize", userSelect: "none", touchAction: "none" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              {/* Before image — always full width underneath */}
              <img
                src={beforePhoto.imageUrl}
                alt="Before"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
              {/* After image — clipped to reveal from the right side of the divider */}
              <img
                src={afterPhoto.imageUrl}
                alt="After"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ clipPath: `inset(0 0 0 ${dragPct}%)` }}
                draggable={false}
              />
              {/* Divider line + handle */}
              <div
                className="absolute top-0 bottom-0 flex items-center justify-center"
                style={{
                  left: `${dragPct}%`,
                  width: 3,
                  background: "white",
                  boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                  transform: "translateX(-50%)",
                  zIndex: 3,
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "white",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                    color: "#A78BFA",
                    letterSpacing: -1,
                  }}
                >
                  ◀▶
                </div>
              </div>
              {/* Date labels */}
              <div
                className="absolute bottom-2 left-2 z-10 text-white font-bold rounded"
                style={{ fontSize: 9, background: "rgba(0,0,0,0.45)", padding: "2px 7px" }}
              >
                {fmtDate(beforePhoto.date)} · Before
              </div>
              <div
                className="absolute bottom-2 right-2 z-10 text-white font-bold rounded"
                style={{ fontSize: 9, background: "rgba(167,139,250,0.75)", padding: "2px 7px" }}
              >
                {fmtDate(afterPhoto.date)} · After
              </div>
            </div>
          </div>

          <p
            className="text-center mb-2"
            style={{ fontSize: 10, color: "#c0b0c8", letterSpacing: "0.02em" }}
          >
            drag ◀▶ to compare · tap photos below to swap
          </p>

          {/* Thumbnail strip */}
          <div
            className="flex gap-1.5 px-4 pb-2 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {photos.map((photo, idx) => {
              const isBefore = photo.id === beforePhoto.id;
              const isAfter  = idx === afterIdx;
              return (
                <button
                  key={photo.id}
                  onClick={() => { if (!isBefore) setAfterIdx(idx); }}
                  className="relative flex-shrink-0 rounded-xl overflow-hidden transition-all active:scale-95"
                  style={{
                    width: 52,
                    height: 52,
                    border: isBefore
                      ? "2px solid #9ca3af"
                      : isAfter
                      ? "2px solid #a78bfa"
                      : "2px solid transparent",
                    boxShadow: isAfter && !isBefore ? "0 0 0 2px rgba(167,139,250,0.2)" : "none",
                  }}
                >
                  <img src={photo.imageUrl} alt="" className="w-full h-full object-cover" />
                  {isBefore && (
                    <span
                      className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full"
                      style={{ background: "#9ca3af", border: "1.5px solid white" }}
                    />
                  )}
                  {isAfter && !isBefore && (
                    <span
                      className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full"
                      style={{ background: "#a78bfa", border: "1.5px solid white" }}
                    />
                  )}
                </button>
              );
            })}
            {/* Add thumbnail */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-shrink-0 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{
                width: 52,
                height: 52,
                border: "1.5px dashed rgba(167,139,250,0.35)",
                background: "rgba(167,139,250,0.05)",
                color: "#a78bfa",
                fontSize: 18,
              }}
            >
              ＋
            </button>
          </div>

          {uploadError && (
            <p className="text-xs text-red-400 text-center mb-2">{uploadError}</p>
          )}

          {/* Add button */}
          <div className="px-4 pb-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-98"
              style={{
                border: "1px dashed rgba(167,139,250,0.3)",
                color: "#A78BFA",
                background: "rgba(167,139,250,0.05)",
              }}
            >
              {uploading ? "Uploading…" : "+ Add check-in photo"}
            </button>
          </div>
        </>
      )}

      {/* Hidden file input — capture="environment" opens camera on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Timeline CTA */}
      <button
        onClick={onViewTimeline}
        className="w-full py-3 text-xs font-semibold text-center transition-all active:scale-98 border-t flex items-center justify-center gap-1.5"
        style={{ color: "#A78BFA", borderColor: "var(--color-border)" }}
      >
        <span>📅</span> View Progress Timeline →
      </button>

      {/* Full-screen preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewUrl}
              alt="Progress photo"
              className="w-full rounded-2xl object-contain max-h-[80vh]"
            />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors in `components/ProgressPhotosCard.tsx`. (There will be errors in `app/profile/page.tsx` until Task 3 is done — that's expected.)

- [ ] **Step 3: Commit**

```bash
git add components/ProgressPhotosCard.tsx
git commit -m "feat: rewrite ProgressPhotosCard with drag slider, thumbnail strip, and capture=environment"
```

---

## Task 3: Update app/profile/page.tsx

**Files:**
- Modify: `app/profile/page.tsx`

There are six spots to change. Make each edit precisely.

- [ ] **Step 1: Swap the progressPhotos import (line 16)**

Old:
```ts
import { getProgressPhotos, type ProgressPhoto } from "@/lib/progressPhotos";
```

New:
```ts
import { getProgressEntries, type ProgressEntry } from "@/lib/progressEntries";
```

- [ ] **Step 2: Update the state type (line 116)**

Old:
```ts
const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
```

New:
```ts
const [progressPhotos, setProgressPhotos] = useState<ProgressEntry[]>([]);
```

- [ ] **Step 3: Update the standalone fetch on mount (line 180)**

Old:
```ts
getProgressPhotos().then(setProgressPhotos);
```

New:
```ts
getProgressEntries().then(setProgressPhotos);
```

- [ ] **Step 4: Update the Promise.all fetch (line 190)**

Old:
```ts
getProgressPhotos(),
```

New:
```ts
getProgressEntries(),
```

- [ ] **Step 5: Fix the achievement count cast (line 214)**

Old:
```ts
progressPhotos:  (photos as import("@/lib/progressPhotos").ProgressPhoto[]).length,
```

New:
```ts
progressPhotos:  (photos as ProgressEntry[]).length,
```

- [ ] **Step 6: Update the ProgressPhotosCard usage (lines 619–622)**

Old:
```tsx
<ProgressPhotosCard
  photos={progressPhotos}
  onPhotoAdded={() => getProgressPhotos().then(setProgressPhotos)}
  onViewTimeline={() => setShowTimeline(true)}
/>
```

New:
```tsx
<ProgressPhotosCard
  photos={progressPhotos}
  phase={phase}
  onPhotoAdded={(entry) => setProgressPhotos(prev => [entry, ...prev])}
  onViewTimeline={() => setShowTimeline(true)}
/>
```

(`phase` is already defined on line 72 as `const phase = phaseData.phase;`)

- [ ] **Step 7: Verify TypeScript compiles with zero errors**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add app/profile/page.tsx
git commit -m "feat: wire profile page to ProgressEntry[], optimistic photo prepend"
```

---

## Task 4: Delete lib/progressPhotos.ts

**Files:**
- Delete: `lib/progressPhotos.ts`

- [ ] **Step 1: Confirm no remaining imports**

Search for any remaining references:
```bash
grep -r "progressPhotos" lib/ app/ components/ --include="*.ts" --include="*.tsx" -l
```

Expected output: nothing (empty). If any file still imports from `progressPhotos`, fix it before deleting.

- [ ] **Step 2: Delete the file**

```bash
rm lib/progressPhotos.ts
```

- [ ] **Step 3: Verify build is still clean**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -u lib/progressPhotos.ts
git commit -m "chore: delete lib/progressPhotos.ts — merged into progressEntries"
```

---

## Task 5: Apply SQL Migration

**Files:**
- Run: `supabase/migrations/20260501_merge_progress_photos.sql` against production Supabase

- [ ] **Step 1: Apply the migration via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with:
- `project_id`: `nngkzdriribywaqnkbui`
- `name`: `20260501_merge_progress_photos`
- `query`: (the full SQL content from the migration file)

- [ ] **Step 2: Verify the migration ran**

Use `mcp__claude_ai_Supabase__execute_sql` to confirm:

```sql
SELECT COUNT(*) FROM progress_entries;
```

And confirm `progress_photos` no longer exists:

```sql
SELECT to_regclass('public.progress_photos');
```

Expected: `NULL` (table dropped).

- [ ] **Step 3: No commit needed** — migration is applied to Supabase directly.

---

## Task 6: Polish ProgressTimeline

**Files:**
- Modify: `components/ProgressTimeline.tsx`

Three targeted changes. Make them in order.

- [ ] **Step 1: Widen photo thumbnails (line 459)**

Old:
```tsx
<div className="w-24 flex-shrink-0" style={{ minHeight: "120px" }}>
```

New:
```tsx
<div className="w-32 flex-shrink-0" style={{ minHeight: "128px" }}>
```

Also update the `<img>` inside it — change `style={{ minHeight: "120px" }}` to `style={{ minHeight: "128px" }}`.

Old:
```tsx
<img
  src={entry.imageUrl}
  alt="Progress"
  className="w-full h-full object-cover"
  style={{ minHeight: "120px" }}
/>
```

New:
```tsx
<img
  src={entry.imageUrl}
  alt="Progress"
  className="w-full h-full object-cover"
  style={{ minHeight: "128px" }}
/>
```

- [ ] **Step 2: Add tap-to-fullscreen state and wrap photo in a button**

At the top of the component, next to the existing state declarations, add:

```tsx
const [timelinePreview, setTimelinePreview] = useState<string | null>(null);
```

Then wrap the `<img>` in a `<button>`:

Old:
```tsx
<div className="w-32 flex-shrink-0" style={{ minHeight: "128px" }}>
  <img
    src={entry.imageUrl}
    alt="Progress"
    className="w-full h-full object-cover"
    style={{ minHeight: "128px" }}
  />
</div>
```

New:
```tsx
<div className="w-32 flex-shrink-0" style={{ minHeight: "128px" }}>
  <button
    onClick={() => setTimelinePreview(entry.imageUrl)}
    className="w-full h-full block"
    style={{ minHeight: "128px" }}
  >
    <img
      src={entry.imageUrl}
      alt="Progress"
      className="w-full h-full object-cover"
      style={{ minHeight: "128px" }}
    />
  </button>
</div>
```

Then add the fullscreen overlay just before the closing `</div>` of the timeline list's return block (after the `{entries.map(...)}` section, inside the outer `<div className="fixed inset-0 ...">` container, at the very bottom before its closing tag):

```tsx
{/* Fullscreen photo preview */}
{timelinePreview && (
  <div
    className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.85)" }}
    onClick={() => setTimelinePreview(null)}
  >
    <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
      <img
        src={timelinePreview}
        alt="Progress photo"
        className="w-full rounded-2xl object-contain max-h-[80vh]"
      />
      <button
        onClick={() => setTimelinePreview(null)}
        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg"
        style={{ background: "rgba(0,0,0,0.5)" }}
      >
        ×
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 3: Add two-step delete confirmation state**

Add `confirmDeleteId` state next to the existing `deletingId`:

```tsx
const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
```

- [ ] **Step 4: Replace the delete button with two-step flow**

Old (the delete button, lines ~487–498):
```tsx
<button
  onClick={() => handleDelete(entry)}
  disabled={deletingId === entry.id}
  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-40"
  style={{
    background: "rgba(248,113,113,0.10)",
    color: "#EF4444",
    border: "1px solid rgba(248,113,113,0.2)",
    fontSize: "0.85rem",
  }}
>
  {deletingId === entry.id ? "…" : "✕"}
</button>
```

New:
```tsx
{confirmDeleteId === entry.id ? (
  <div className="flex items-center gap-1.5 flex-shrink-0">
    <button
      onClick={() => { handleDelete(entry); setConfirmDeleteId(null); }}
      disabled={deletingId === entry.id}
      className="px-2 py-1 rounded-lg text-[10px] font-bold text-white transition-all active:scale-90 disabled:opacity-40"
      style={{ background: "#EF4444" }}
    >
      {deletingId === entry.id ? "…" : "Delete"}
    </button>
    <button
      onClick={() => setConfirmDeleteId(null)}
      className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-90"
      style={{ background: "var(--color-surface-2)", color: "var(--color-text-mid)", border: "1px solid var(--color-border)" }}
    >
      Cancel
    </button>
  </div>
) : (
  <button
    onClick={() => setConfirmDeleteId(entry.id)}
    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
    style={{
      background: "rgba(248,113,113,0.10)",
      color: "#EF4444",
      border: "1px solid rgba(248,113,113,0.2)",
      fontSize: "0.85rem",
    }}
  >
    ✕
  </button>
)}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Verify the build passes**

```bash
npm run build
```

Expected: `✓ Compiled successfully` with no type errors.

- [ ] **Step 7: Commit**

```bash
git add components/ProgressTimeline.tsx
git commit -m "polish: timeline w-32 thumbnails, tap-to-fullscreen, two-step delete confirm"
```

---

## Self-Review

Spec coverage check:

| Spec requirement | Task that implements it |
|-----------------|------------------------|
| Merge `progress_photos` → `progress_entries` via migration | Task 1 |
| Delete `lib/progressPhotos.ts` | Task 4 |
| Apply migration | Task 5 |
| N+1 fix — already done in `getProgressEntries` via `Promise.all` | No action needed |
| `ProgressPhotosCard` 0-photo state | Task 2 |
| `ProgressPhotosCard` 1-photo state with nudge | Task 2 |
| `ProgressPhotosCard` 2+ state: drag slider | Task 2 |
| Slider: pure CSS `clipPath` + pointer events, touch-friendly | Task 2 |
| Thumbnail strip: grey dot = before (locked oldest), purple dot = after (tappable) | Task 2 |
| `capture="environment"` on file input | Task 2 |
| Optimistic prepend after upload | Task 3 |
| Profile page swap imports + state type | Task 3 |
| Timeline: w-24→w-32 thumbnails | Task 6 |
| Timeline: tap-to-fullscreen overlay | Task 6 |
| Timeline: two-step delete confirmation | Task 6 |

All spec requirements covered. No placeholders.
