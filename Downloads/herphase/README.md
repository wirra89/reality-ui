# HerPhase 🌸

> Cycle-aware fitness app — adapts training, nutrition, and recommendations to the menstrual cycle.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (PostgreSQL database)

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Open the **SQL Editor** and run the migration:

```sql
-- Copy contents of: supabase/migrations/001_create_cycle_logs.sql
```

3. Get your keys from **Settings → API**

### 3. Configure environment variables

Edit `.env.local` and replace with your real values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it auto-redirects to `/dashboard`.

---

## Project Structure

```
herphase/
├── app/
│   ├── layout.tsx          # Root layout (fonts, metadata)
│   ├── page.tsx            # Redirect → /dashboard
│   ├── globals.css         # Tailwind + custom animations
│   └── dashboard/
│       └── page.tsx        # ★ Main dashboard (all state lives here)
├── components/
│   ├── CycleBadge.tsx      # Phase ring + progress arc
│   ├── CycleSlider.tsx     # Day slider + phase legend
│   ├── WorkoutCard.tsx     # Dark training card
│   ├── AIRecommendationCard.tsx  # HerPhase AI insight
│   ├── ReadinessCard.tsx   # Score ring
│   ├── NutritionCard.tsx   # Macro bars + guidance
│   └── CheckInButton.tsx   # Save to Supabase CTA
├── lib/
│   ├── cycle.ts            # ★ Phase logic + recommendations
│   └── supabase.ts         # ★ DB client + helpers
└── supabase/
    └── migrations/
        └── 001_create_cycle_logs.sql
```

---

## Most Important Files

| File | Why |
|------|-----|
| `lib/cycle.ts` | All phase detection + recommendation data |
| `lib/supabase.ts` | Database client + `saveCycleLog()` |
| `app/dashboard/page.tsx` | App state, layout, composition |
| `components/CycleBadge.tsx` | Phase progress ring visual |

---

## Testing the Dashboard

1. Open `/dashboard`
2. Drag the slider or tap `+` / `−` to change the cycle day
3. Watch the phase badge, workout card, AI card, and nutrition update live
4. Click **"Save Check-in"** — check your Supabase table for the new row

---

## Cycle Phase Logic

| Days | Phase | Label |
|------|-------|-------|
| 1–5 | Menstrual | Low energy |
| 6–13 | Follicular | Build phase |
| 14–16 | Ovulation | Peak performance |
| 17–28 | Luteal | Stabilize & recover |

---

## Next Steps (post-MVP)

- [ ] Add Supabase Auth (email/password or magic link)
- [ ] Store user profile (name, cycle length)
- [ ] Weekly check-in history view
- [ ] Push notifications / reminders
- [ ] Meal plan generator
- [ ] Integration with Apple Health / Garmin
