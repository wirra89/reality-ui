# Profile Page Redesign — Design Spec

**Date:** 2026-04-24  
**Status:** Approved

---

## Goal

Make the profile page personal and motivating by surfacing four new data surfaces: weight trend in the hero card, top 3 lifts (gold/silver/bronze), progress photos (side-by-side compare), and achievement badges.

---

## Scope

| Feature | DB change | Storage |
|---|---|---|
| Weight trend in hero | No | — |
| Top 3 lifts | No | — |
| Progress photos | Yes — new table + bucket | Supabase Storage |
| Achievement badges | No | — |

Items ①②④ are pure frontend additions using data already in `weight_logs` and `personal_records`. Item ③ requires a Supabase migration.

---

## Architecture

All four additions live entirely in `app/profile/page.tsx` and a set of new single-purpose components. The profile page already fetches `profile`, `user`, `cycleDay`, and `cycleParams` from `AppContext`. New data fetches (weight trend, top lifts, photos, achievements) happen inside the profile page's `useEffect` block using existing Supabase helpers where possible and two new helpers where not.

No changes to AppContext, no new routes.

---

## ① Weight Trend in Hero

### Data
- Fetch the two most recent rows from `weight_logs` ordered by `logged_at DESC LIMIT 2`.
- Delta = latest − previous. Show `↑` / `↓` / `→` (< 0.1 kg change = flat).
- If fewer than 2 rows exist, render nothing (no empty state needed — the rest of the hero already fills the space).

### Component
Inline inside the existing hero block in `app/profile/page.tsx`. No new component file needed — a small conditional `<div>` row below the badge/streak line:

```
63.2 kg  ↓ 0.4 kg this week
```

Styled with the existing `text-secondary` / `text-emerald` tokens. Direction arrow color: green for down (fat loss), neutral for up, neutral for flat.

---

## ② Top 3 Lifts

### Data
- `getBestPRPerExercise()` already exists in `lib/supabase.ts` — returns `{ exercise: string; weight: number; reps: number; cycleDay: number; phase: string }[]`.
- Sort descending by `weight`, take first 3.
- If 0 PRs: hide the card entirely.

### Component
New file: `components/TopLiftsCard.tsx`

Props:
```typescript
interface TopLiftsCardProps {
  prs: PersonalRecord[];  // PersonalRecord exported from lib/supabase.ts
}
```

Renders a card with:
- Section title "Top lifts" (rose label style)
- Three rows, each: rank dot (gold/silver/bronze), exercise name, `weight × reps`, phase tag
- "View all PRs →" link at bottom pointing to `/prs`

Rank colours: gold `#FBBF24`, silver `#C0C0C0`, bronze `#CD7F32`.

---

## ③ Progress Photos

### Database migration
New table `progress_photos`:

```sql
create table progress_photos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  photo_url   text not null,
  taken_at    timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

alter table progress_photos enable row level security;

create policy "Users manage own photos"
  on progress_photos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on progress_photos (user_id, taken_at desc);
```

### Storage bucket
Bucket name: `progress-photos`  
Access: private (no public URL)  
File path pattern: `{user_id}/{uuid}.jpg`  
RLS policy on bucket: users can only upload/read/delete their own prefix.

### Supabase helpers — `lib/progressPhotos.ts`
New file exposing:

```typescript
export interface ProgressPhoto {
  id: string;
  photoUrl: string;
  takenAt: string;        // ISO string
}

export async function getProgressPhotos(): Promise<ProgressPhoto[]>
// Fetches all rows for authed user ordered by taken_at ASC

export async function uploadProgressPhoto(file: File): Promise<ProgressPhoto>
// Uploads to storage → inserts row → returns new ProgressPhoto

export async function deleteProgressPhoto(id: string, photoUrl: string): Promise<void>
// Deletes storage object then deletes DB row
```

### Signed URLs
`getProgressPhotos` fetches rows then calls `supabase.storage.from('progress-photos').createSignedUrl(path, 3600)` per row to produce time-limited URLs. The path equals `photo_url` exactly — the column stores the storage object path (e.g. `{user_id}/{uuid}.jpg`), never a full URL.

### Component
New file: `components/ProgressPhotosCard.tsx`

Props:
```typescript
interface ProgressPhotosCardProps {
  photos: ProgressPhoto[];
  signedUrls: Record<string, string>;   // id → signed URL
  onPhotoAdded: () => void;
  onPhotoDeleted: () => void;
}
```

**Layout (Side-by-Side Compare):**
- Shows first photo (oldest) on the left, last photo (newest) on the right, connected by a `→` arrow.
- Labels: "Jan 2025 · Start" / "Apr 2025 · Now" (formatted from `takenAt`).
- Sub-line: "X photos · X months".
- "+ Add photo" dashed button at bottom.
- **0 photos state:** single centred "Add your first check-in photo" prompt.
- **1 photo state:** left side shows the photo labelled "Start", right side is a dashed placeholder "Add now".
- Tap any photo to open a full-screen preview (uses a simple `<dialog>` element, no library).

**Upload flow:**
- `<input type="file" accept="image/*">` hidden, triggered by the add button.
- On file select: call `uploadProgressPhoto(file)`, show inline spinner, call `onPhotoAdded` on success.
- Errors shown inline below the button (no toast needed — user is already looking at the card).

---

## ④ Achievement Badges

### Logic — `lib/achievements.ts`
New file. Pure computation from passed-in counts — no async, no Supabase calls.

```typescript
export interface AchievementDef {
  id: string;
  icon: string;
  label: string;
  description: string;
  unlocked: boolean;
  progress?: string;       // e.g. "7 / 10 workouts" when not yet unlocked
}

export interface AchievementCounts {
  workouts: number;
  meals: number;
  prs: number;
  weightLogs: number;
  uniqueExercises: number;
  currentStreak: number;
  maxStreak: number;
}

export function computeAchievements(counts: AchievementCounts): AchievementDef[]
```

Badge set (7 badges):

| id | icon | label | Unlock condition |
|---|---|---|---|
| first_pr | 🏋️ | First PR | prs ≥ 1 |
| streak_7 | 🔥 | 7-day streak | maxStreak ≥ 7 |
| streak_30 | 🌟 | 30-day streak | maxStreak ≥ 30 |
| workouts_10 | 💪 | 10 workouts | workouts ≥ 10 |
| meals_50 | 🥗 | 50 meals logged | meals ≥ 50 |
| first_weight | ⚖️ | Weighed in | weightLogs ≥ 1 |
| variety_5 | 🎯 | Mix it up | uniqueExercises ≥ 5 |

### Data fetching
The profile page queries:
- `personal_records` count → `prs`
- `meal_log_entries` count → `meals`
- `weight_logs` count → `weightLogs`
- `training_logs` count → `workouts`; distinct `exercise_name` count → `uniqueExercises`
- Current streak and max streak — already available in `profile` row or computed from `training_logs`

### Component
New file: `components/AchievementsCard.tsx`

Props:
```typescript
interface AchievementsCardProps {
  achievements: AchievementDef[];
}
```

Layout:
- Section title "Achievements" (rose label).
- Horizontal scroll strip. Each badge: icon circle (full colour if unlocked, greyed if locked) + label below.
- Locked badges show progress hint as a sub-label (e.g., "3 / 7 workouts").
- Unlocked count in title: "Achievements · 3 / 7".
- No "See all" expand needed with only 7 badges — show all in one row.

---

## Profile Page Assembly

`app/profile/page.tsx` changes:
1. Add `useEffect` to fetch: weight delta (2 rows), top PRs, progress photos + signed URLs, achievement counts.
2. Add four new state vars: `weightDelta`, `topPrs`, `progressPhotos`, `achievements`.
3. Insert weight trend row inside existing hero card.
4. Insert `<TopLiftsCard>`, `<ProgressPhotosCard>`, `<AchievementsCard>` between the stat tiles and the existing settings blocks.

No existing sections are removed. Existing cycle/goals/macros blocks remain unchanged below the new cards.

---

## Card Order (final)

1. Hero (avatar + name + phase badge + streak + **weight trend**)
2. Stat tiles (streak · workouts · PRs)
3. **Top 3 lifts**
4. **Progress photos**
5. **Achievements**
6. Cycle settings ▾ (existing, collapsed)
7. My goals · Macros · Preferences (existing, collapsed)
8. My data → (existing)

---

## Error Handling

- Weight trend: silently hidden if fetch fails or < 2 rows.
- Top lifts: silently hidden if 0 PRs.
- Progress photos: show error inline on upload failure; show empty state if fetch fails.
- Achievements: counts default to 0 on fetch error (all badges show locked with 0 progress).

---

## Out of Scope

- Sharing progress photos externally.
- Custom achievement creation.
- Photo cropping/editing before upload.
- Weight trend graph (sparkline) on profile — weight page already has this.
