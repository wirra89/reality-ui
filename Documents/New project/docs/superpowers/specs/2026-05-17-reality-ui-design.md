# Reality UI — Design Spec
**Date:** 2026-05-17
**Status:** Approved

---

## Overview

Reality UI is a mobile-first mental operating system inspired by Scott Adams' "User Interface for Reality" concept. It helps users analyze situations through cognitive lenses, detect emotional distortions, reframe reality more clearly, and choose better actions.

**Positioning:** A strategic cognitive analysis system — a perception debugger, not a manifestation or spiritual app.

**Tone:** Intelligent, calm, strategic, powerful. Never cringe, never preachy.

---

## Tech Stack

- **Framework:** Next.js 16 App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion
- **Font:** Inter (Google Fonts)
- **Persistence:** localStorage only (no backend)
- **PWA:** Basic manifest + meta tags for installability
- **Platform:** Mobile-first, responsive

---

## Visual Design System

**Palette:**
- Background: `#050509` (near-black)
- Surface: `rgba(255,255,255,0.055)` (glassmorphism)
- Border: `rgba(255,255,255,0.08)–0.12`
- Primary text: `#f0f0ff`
- Secondary text: `#a0a0c0`
- Muted: `#5050a0`
- Accent violet: `#b090ff`
- Accent blue: `#6090ff`
- Glow: `rgba(100,60,220,0.25–0.35)`

**Background treatment:** Radial violet glow top-left + blue glow top-right on `body`, same as current `globals.css`.

**Cards:** Glassmorphism — `bg-white/[0.055]`, `border border-white/10`, `backdrop-blur-xl`, `rounded-2xl`.

**Typography:**
- Headings: Inter, weight 300–600
- UI labels: Inter, uppercase, letter-spacing wide, 9–10px
- Reframe quotes: Inter, weight 200–300, italic, large

**Motion (Framer Motion):**
- Page transitions: fade + slight upward slide (y: 12 → 0, opacity 0 → 1, 300ms ease)
- Card entrances: staggered fade-in (50ms delay between cards)
- Score counter: animated number roll on mount
- Clear Screen: slow fade-in (600ms) for the reframe quote

---

## Architecture

### Folder Structure

```
app/
  layout.tsx                # Root layout — Inter font, BottomNav, PageTransition
  globals.css               # Design tokens + base styles
  page.tsx                  # Home Dashboard
  decode/
    page.tsx                # Decode Reality
  result/
    page.tsx                # Analysis Result (?id= param)
  clear/
    page.tsx                # Clear Screen (?id= param)
  lenses/
    page.tsx                # Lens Library
  history/
    page.tsx                # Pattern History
  checkin/
    page.tsx                # Daily Check-In

lib/
  lenses.ts                 # 15 lens definitions (pure data)
  realityEngine.ts          # Rule-based analysis engine (pure functions)
  storage.ts                # All localStorage access

types/
  reality.ts                # All shared TypeScript types

components/
  BottomNav.tsx             # 5-tab mobile navigation
  GlassCard.tsx             # Reusable glassmorphism card
  LensTag.tsx               # Lens name pill/badge
  ScoreRing.tsx             # Animated clarity score ring
  PageTransition.tsx        # Framer Motion page wrapper
  SliderInput.tsx           # Styled range slider (mood/stress/confidence)

public/
  manifest.json             # PWA manifest
```

### Data Flow

1. User fills decode form (`/decode`)
2. Engine runs synchronously → produces `RealityEntry`
3. Entry saved to localStorage with UUID
4. Redirect to `/result?id={uuid}`
5. Result screen reads entry from storage by ID
6. "Clear Screen" button → `/clear?id={uuid}`

### localStorage Keys

| Key | Content |
|-----|---------|
| `reality:entries` | `RealityEntry[]` — all decoded situations |
| `reality:checkins` | `CheckIn[]` — daily check-in history |
| `reality:settings` | `{ onboardingDone: boolean }` |

All access goes through `lib/storage.ts` — no direct `localStorage` calls in components.

---

## Types (`types/reality.ts`)

```ts
export type LensId =
  | 'logic' | 'religion' | 'mating' | 'statistics' | 'science'
  | 'persuasion' | 'economics' | 'simulation' | 'winners-losers'
  | 'predator-prey' | 'strategy' | 'abundance' | 'moist-robot'
  | 'victim-oppressor' | 'mind-reading';

export type Lens = {
  id: LensId;
  name: string;
  description: string;
  coreQuestion: string;
  blindSpot: string;
  power: string;
  examples: string[];
};

export type RealityEntry = {
  id: string;
  situation: string;
  mood: number;        // 0–100
  stress: number;      // 0–100
  confidence: number;  // 0–100
  primaryLens: LensId;
  alternateLenses: LensId[];
  hiddenAssumption: string;
  distortion: string;
  betterFrame: string;
  bestAction: string;
  clarityScore: number; // 0–100
  createdAt: string;    // ISO string
};

export type CheckIn = {
  id: string;
  date: string;         // YYYY-MM-DD
  energy: number;       // 0–100
  mood: number;         // 0–100
  stress: number;       // 0–100
  confidence: number;   // 0–100
  dominantThought: string;
  predictedLens: LensId;
  createdAt: string;
};
```

---

## Lens System (`lib/lenses.ts`)

All 15 lenses as a typed array. Each lens:

| Field | Purpose |
|-------|---------|
| `id` | LensId — used for matching and storage |
| `name` | Display name |
| `description` | 1–2 sentence explanation |
| `coreQuestion` | The question this lens asks |
| `blindSpot` | What this lens misses or distorts |
| `power` | What this lens reveals |
| `examples` | 2–3 real-world example situations |

**All 15 lenses:**
1. Logic
2. Religion / Meaning
3. Mating / Attraction
4. Statistics
5. Science
6. Persuasion
7. Economics
8. Simulation Theory
9. Winners vs Losers
10. Predator vs Prey
11. Strategy
12. Abundance Mindset
13. Moist Robot
14. Victim vs Oppressor
15. Mind Reading

---

## Reality Engine (`lib/realityEngine.ts`)

Pure function: `analyzeReality(input: EngineInput): RealityEntry`

### Input
```ts
type EngineInput = {
  situation: string;
  mood: number;
  stress: number;
  confidence: number;
};
```

### Rule System

~20 ordered rules. Each rule:
```ts
type EngineRule = {
  keywords: string[];         // Any match triggers rule
  stressMin?: number;         // Optional state conditions
  confidenceMax?: number;
  primaryLens: LensId;
  hiddenAssumption: string;
  distortion: string;
  betterFrame: string;
  bestAction: string;
  alternateLenses: LensId[];
};
```

First matching rule wins. Fallback rule (always matches): Logic lens.

### Rule Coverage (~20 rules)

Patterns covered:
- **Silence / no reply** → Mating, Mind Reading
- **Rejection / ghosting** → Mating, Abundance
- **Conflict / argument** → Strategy, Victim-Oppressor
- **Failure / mistake** → Winners-Losers, Logic
- **Social judgment / embarrassment** → Mind Reading, Persuasion
- **Comparison / others succeeding** → Abundance, Statistics
- **Control loss / uncertainty** → Moist Robot, Science
- **Work pressure / deadline** → Strategy, Economics
- **Relationship uncertainty** → Statistics, Mating
- **Feeling stuck / no progress** → Strategy, Winners-Losers
- **Betrayal / trust broken** → Logic, Victim-Oppressor
- **Health anxiety** → Science, Statistics
- **Financial stress** → Economics, Abundance
- **Social media / validation** → Persuasion, Abundance
- **Anger / provocation** → Predator-Prey, Strategy
- Fallback: Logic

### Clarity Score Formula
```ts
clarityScore = Math.round(
  (100 - stress) * 0.35 +
  confidence * 0.35 +
  matchStrength * 0.30   // 100 if keyword match, 65 if fallback
);
```
Clamped to 0–100.

### Alternate Lenses

Every result includes 3–4 alternates. Rules:
- Always include **Statistics** (grounds emotional situations in data) — if Statistics is the primary lens, substitute **Logic** instead
- Always include one "grounding" lens (Moist Robot, Logic, or Science) — not duplicating the above
- Remaining 1–2 from rule-specific alternates

### Multi-Lens View

On the Result screen, tapping an alternate lens calls:
```ts
reframeForLens(entry: RealityEntry, lensId: LensId): { frame: string; action: string }
```
Returns a lens-specific reframe + action for the same situation. Rendered inline on the Result screen — no navigation required.

---

## Screens

### 1. Home Dashboard (`/`)

**Header:** *"What reality are you operating from today?"*

**Sections:**
- **State strip:** Today's dominant lens (from most recent entry) + clarity score ring + emotional state label from last check-in. Empty state if no entries yet.
- **Quick actions:** "Decode Reality" (primary, white button) + "Check In" (secondary, ghost button)
- **Recent entries:** Last 3 `RealityEntry` cards — situation preview, lens tag, clarity score, timestamp. Tap → `/result?id=xxx`
- **First-time empty state:** Single card with brief explanation + "Start your first decode" CTA

### 2. Decode Reality (`/decode`)

**Sections:**
- Large premium textarea — placeholder: *"Describe what happened, exactly as your mind is presenting it..."*
- Three `SliderInput` components: Mood (low → clear), Stress (calm → overwhelmed), Confidence (shaky → solid)
- "Decode Reality" button — disabled until situation.trim().length > 10
- On submit: `analyzeReality(input)` → `saveEntry(result)` → `router.push('/result?id=' + result.id)`

### 3. Analysis Result (`/result?id=xxx`) — Layout C

**Layout (top to bottom):**
1. Small eyebrow: *"REALITY DECODED"*
2. Large clarity score (animated counter on mount)
3. Primary lens name
4. Reframe quote (italic, light weight): `entry.betterFrame`
5. Horizontal divider
6. Two stat chips: Distortion type + Assumption
7. Best action (quiet, left-border row)
8. **"See through other lenses"** — horizontal scroll row of alternate lens cards; tap any to expand an inline reframe panel below
9. Two buttons: "Clear Screen" (primary) → `/clear?id=xxx`, "Decode another" (secondary) → `/decode`

### 4. Clear Screen (`/clear?id=xxx`) — Layout C

**Full-screen cinematic view:**
- Dual corner glows (violet top-left, blue bottom-right)
- *"CLEAR"* eyebrow, 9px uppercase spaced
- Reframe quote, font-weight 200, large, centered, slow fade-in
- Score + Lens stats centered below (two columns with divider)
- Best action as quiet italic below a subtle line
- "Back to Reality" button → `/`

### 5. Lens Library (`/lenses`)

- Section header: *"The 15 Lenses of Reality"*
- Grid of lens cards (2-col on mobile)
- Each card: lens name + core question (collapsed)
- Tap → expand to show: description, power, blind spot, examples
- Lenses the user has triggered get a subtle violet dot badge
- Lenses sorted: most-triggered first (if history exists), alphabetical otherwise

### 6. Pattern History (`/history`)

- **Blind spot banner** (pinned top): Appears when any single lens appears in 3 or more entries within the last 30 days. Text: *"You've decoded [lens] [N] times this month. This may be a recurring blind spot."* Dismissed per session.
- Recurring pattern chips: Mind Reading, Rejection Sensitivity, Victim Lens, Catastrophising, Scarcity — shown when detected
- Chronological entry list (newest first)
- Each entry: situation preview (2 lines), lens tag, clarity score, date
- Tap → `/result?id=xxx`
- Empty state if no entries

### 7. Daily Check-In (`/checkin`)

**Inputs:**
- Energy slider (drained → charged)
- Mood slider (dark → clear)
- Stress slider (calm → overwhelmed)
- Confidence slider (shaky → solid)
- Dominant thought textarea: *"What's the first thing on your mind today?"*

**On submit:**
- Engine predicts dominant lens from dominant thought text
- Shows result card: *"Today's dominant reality filter: [Lens Name]"* + one-line explanation
- Saved to `reality:checkins`
- "Go to Dashboard" button

---

## Navigation

**Bottom nav — 5 tabs:**

| Tab | Label | Route |
|-----|-------|-------|
| 01 | Home | `/` |
| 02 | Decode | `/decode` |
| 03 | Lenses | `/lenses` |
| 04 | History | `/history` |
| 05 | Check In | `/checkin` |

Clear Screen (`/clear`) has no nav — back button only.
Result Screen (`/result`) has no nav — back button + decode another.

---

## PWA

`public/manifest.json`:
- `name`: "Reality UI"
- `short_name`: "Reality"
- `theme_color`: `#050509`
- `background_color`: `#050509`
- `display`: `standalone`
- `start_url`: `/`

Meta tags in `layout.tsx`: `viewport`, `theme-color`, `apple-mobile-web-app-capable`.

---

## What This Is Not

- Not a manifestation app
- Not spiritual or cringe
- No AI API calls (rule-based engine only, for now)
- No backend
- No accounts or sync
- No notifications
