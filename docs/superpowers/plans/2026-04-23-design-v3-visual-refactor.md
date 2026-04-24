# HerPhase Design V3 — Visual System Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Baby Rose V3 design language (stronger glow, Playfair Display + DM Sans fonts, premium cards, phase-aware components) to the existing HerPhase app without breaking any live functionality.

**Architecture:** Visual-system refactor on top of the existing Next.js/Supabase app. All live data, routes, and logic stay intact. New shared components wrap live data; page layouts get redesigned shells around existing logic. Typography replaces Manrope+Nunito with Playfair Display+DM Sans at the layout level.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase, next/font/google

---

## Design reference

Source: `Downloads/herphase` (extracted from Claude Design bundle)

Key tokens from design:
- `--rose: #E8829A` primary (already in CSS)
- `--rose-deep: #C96480`
- `--rose-mid: #F4B8C6`
- `--rose-soft: #FDE8ED`
- Glow: 2-layer radial, outer `rgba(232,130,154,0.44)` at 95%×80%, inner `rgba(255,195,210,0.28)` at 55%×38%, height 300px
- Phase colors: menstrual `#F87171`, follicular `#34D399`, ovulation `#FBBF24`, luteal `#A78BFA`
- Fonts: Playfair Display (display/headings), DM Sans (body/UI)

## Conflicts resolved

| Design prototype | Real app decision |
|---|---|
| 5-tab nav (no Mood) | Keep 5-tab with Mood intact |
| Static mock data | Wire all components to live Supabase data |
| Simple dashboard (3 focus cards only) | Keep full dashboard logic, add focus cards section |
| "Sarah Chen" hardcoded | Use `profile.name` |
| No history/PRs/weight screens | Keep all existing screens |

---

## File map

### New files to create
- `components/PhaseCard.tsx` — animated SVG phase icon + phase-colored card
- `components/CycleRing.tsx` — SVG 4-phase ring for Insights
- `components/MacroRing.tsx` — circular nutrition progress ring
- `components/Sparkline.tsx` — mini 7-bar trend visualization
- `components/FocusCards.tsx` — Train/Eat/Hydrate priority cards for Dashboard

### Files to modify
- `app/layout.tsx` — swap Nunito+Manrope → DM Sans+Playfair Display
- `tailwind.config.ts` — update fontFamily tokens
- `app/globals.css` — strengthen glow CSS variables, add `.rose-glow` utility class
- `app/dashboard/page.tsx` — use PhaseCard + FocusCards, strengthen glow, stats row
- `app/meals/page.tsx` — add MacroRing, premium card styling
- `app/training/page.tsx` — phase rec banner, exercise set-pills styling
- `app/insights/page.tsx` — add CycleRing + Sparkline to overview tab
- `app/profile/page.tsx` — profile hero section, stat tiles

---

## Task 1 — Typography foundation

**Files:**
- Modify: `app/layout.tsx`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Update layout.tsx fonts**

Replace Nunito and Manrope imports with DM_Sans and Playfair_Display:

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { DM_Sans, Playfair_Display, Space_Mono } from "next/font/google";
import { AppProvider } from "@/context/AppContext";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-accent",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "HerPhase — Cycle-Aware Fitness",
  description: "Train smarter with your cycle.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HerPhase",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.setAttribute('data-theme','rose');` }} />
      </head>
      <body className={`${dmSans.variable} ${playfair.variable} ${spaceMono.variable} font-body bg-background text-dark antialiased`}>
        <AppProvider>
          <div className="pb-28">{children}</div>
          <BottomNavWrapper />
        </AppProvider>
      </body>
    </html>
  );
}

function BottomNavWrapper() {
  return <BottomNav />;
}
```

- [ ] **Step 2: Update tailwind.config.ts fontFamily**

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-bg)",
        surface:    "var(--color-surface)",
        "surface-2":"var(--color-surface-2)",
        primary:    "#E8829A",
        "primary-deep": "#C96480",
        accent:     "#F4B8C6",
        secondary:  "#7B6D8D",
        dark:       "var(--color-text)",
        "text-mid": "var(--color-text-mid)",
        "text-dim": "var(--color-text-dim)",
        card:       "var(--color-surface)",
        ghost:      "var(--color-ghost)",
      },
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "serif"],
        body:    ["'DM Sans'", "system-ui", "sans-serif"],
        accent:  ["'Space Mono'", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(180,80,100,0.08)",
        card: "0 0 0 1px #F5DEE2, 0 4px 16px rgba(180,80,100,0.10)",
        lg:   "0 8px 32px rgba(232,130,154,0.20)",
        dark: "0 8px 32px rgba(42,35,48,0.18)",
      },
      maxWidth: {
        app: "430px",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx tailwind.config.ts
git commit -m "feat: switch fonts to Playfair Display + DM Sans (design v3)"
```

---

## Task 2 — Glow & CSS system

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Update globals.css**

Replace the existing file content (keep all existing custom stuff, just update glow and add utilities):

Add to `:root` block — update shadow tokens and add mono font variable:
```css
/* In :root block — update these values */
--shadow-soft: 0 4px 24px rgba(232,130,154,0.14);
--shadow-card: 0 2px 16px rgba(232,130,154,0.08);
--shadow-lg:   0 8px 32px rgba(232,130,154,0.20);
```

Add these utility classes at the end of the file:

```css
/* ── Rose glow — Design V3 (stronger, two-layer) ────────────────── */
.rose-glow {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 300px;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(
      ellipse 95% 80% at 50% -5%,
      rgba(232, 130, 154, 0.44) 0%,
      rgba(232, 130, 154, 0.14) 52%,
      transparent 72%
    ),
    radial-gradient(
      ellipse 55% 38% at 50% 0%,
      rgba(255, 195, 210, 0.28) 0%,
      transparent 58%
    );
}

/* ── Animated phase icons ────────────────────────────────────────── */
@keyframes sway {
  0%, 100% { transform: rotate(-3deg); }
  50%       { transform: rotate(3deg); }
}
@keyframes leaf-open {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.08); }
}
@keyframes sun-spin { to { transform: rotate(360deg); } }
@keyframes sun-pulse {
  0%, 100% { transform: scale(1);    opacity: 1; }
  50%       { transform: scale(1.12); opacity: 0.85; }
}
@keyframes moon-breath {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50%       { opacity: 0.7;  transform: scale(1.15); }
}
@keyframes twinkle {
  0%, 100% { opacity: 0.2; transform: scale(0.7); }
  50%       { opacity: 1;   transform: scale(1); }
}
@keyframes flicker {
  0%,  100% { transform: scale(1)    rotate(-2deg); filter: drop-shadow(0 0 2px rgba(255,140,60,0.6)); }
  25%        { transform: scale(1.12) rotate(2deg);  filter: drop-shadow(0 0 6px rgba(255,140,60,0.9)); }
  50%        { transform: scale(0.95) rotate(-1deg); filter: drop-shadow(0 0 3px rgba(255,140,60,0.5)); }
  75%        { transform: scale(1.08) rotate(3deg);  filter: drop-shadow(0 0 5px rgba(255,140,60,0.85)); }
}

.phase-glyph-stem   { transform-origin: 50% 100%; animation: sway 4s ease-in-out infinite; }
.phase-glyph-leaf-l { transform-origin: 50% 70%;  animation: leaf-open 3.2s ease-in-out infinite; }
.phase-glyph-leaf-r { transform-origin: 50% 70%;  animation: leaf-open 3.2s ease-in-out infinite 0.6s; }
.phase-glyph-rays   { transform-origin: 50% 50%;  animation: sun-spin 18s linear infinite; }
.phase-glyph-core   { transform-origin: 50% 50%;  animation: sun-pulse 2.4s ease-in-out infinite; }
.phase-glyph-halo   { transform-origin: 50% 50%;  animation: moon-breath 3s ease-in-out infinite; }
.phase-glyph-star-a { transform-origin: center;   animation: twinkle 2.2s ease-in-out infinite; }
.phase-glyph-star-b { transform-origin: center;   animation: twinkle 2.2s ease-in-out infinite 0.8s; }
.phase-glyph-star-c { transform-origin: center;   animation: twinkle 2.2s ease-in-out infinite 1.5s; }
.flame-icon         { display: inline-block; transform-origin: 50% 90%; animation: flicker 1.6s ease-in-out infinite; }
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: strengthen rose glow + add phase icon animations (design v3)"
```

---

## Task 3 — PhaseCard component

**Files:**
- Create: `components/PhaseCard.tsx`

Phase colors and styles:
- follicular: bg `#F2FCF7`, border `#CFF0DF`, icon bg `#E8FBF2`, label color `#1B8A60`, badge bg `#E8FBF2`
- ovulation: bg `#FFF9E6`, border `#F4E3A8`, icon bg `#FFF2CC`, label color `#B45309`, badge bg `#FFF2CC`
- luteal: bg `#F7F2FF`, border `#DDD0F5`, icon bg `#EDE4FF`, label color `#6D3FC0`, badge bg `#EDE4FF`
- menstrual: bg `#FEF2F2`, border `#FED0D0`, icon bg `#FEE2E2`, label color `#DC2626`, badge bg `#FEE2E2`

- [ ] **Step 1: Create PhaseCard.tsx**

```tsx
// components/PhaseCard.tsx
"use client";

type PhaseCardProps = {
  phase: string;
  label: string;          // e.g. "Follicular Phase"
  description: string;    // short descriptor
  cycleDay: number;
  className?: string;
};

const PHASE_STYLE: Record<string, {
  bg: string; border: string; iconBg: string;
  labelColor: string; badgeBg: string; badgeColor: string;
}> = {
  follicular: {
    bg: "#F2FCF7", border: "#CFF0DF", iconBg: "#E8FBF2",
    labelColor: "#1B8A60", badgeBg: "#E8FBF2", badgeColor: "#1B8A60",
  },
  ovulation: {
    bg: "#FFF9E6", border: "#F4E3A8", iconBg: "#FFF2CC",
    labelColor: "#B45309", badgeBg: "#FFF2CC", badgeColor: "#B45309",
  },
  luteal: {
    bg: "#F7F2FF", border: "#DDD0F5", iconBg: "#EDE4FF",
    labelColor: "#6D3FC0", badgeBg: "#EDE4FF", badgeColor: "#6D3FC0",
  },
  menstrual: {
    bg: "#FEF2F2", border: "#FED0D0", iconBg: "#FEE2E2",
    labelColor: "#DC2626", badgeBg: "#FEE2E2", badgeColor: "#DC2626",
  },
};

function SproutIcon() {
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      <path className="phase-glyph-stem" d="M14 26 V13" stroke="#1B8A60" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path className="phase-glyph-leaf-l" d="M14 16 C 8 14, 6 9, 9 5 C 13 7, 14 12, 14 16 Z" fill="#34D399" />
      <path className="phase-glyph-leaf-r" d="M14 14 C 20 12, 22 7, 19 3 C 15 5, 14 10, 14 14 Z" fill="#6EE7B7" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      <g className="phase-glyph-rays" stroke="#D9A94A" strokeWidth="1.6" strokeLinecap="round">
        <line x1="14" y1="2"  x2="14" y2="6" />
        <line x1="14" y1="22" x2="14" y2="26" />
        <line x1="2"  y1="14" x2="6"  y2="14" />
        <line x1="22" y1="14" x2="26" y2="14" />
        <line x1="5"  y1="5"  x2="8"  y2="8" />
        <line x1="20" y1="20" x2="23" y2="23" />
        <line x1="5"  y1="23" x2="8"  y2="20" />
        <line x1="20" y1="8"  x2="23" y2="5" />
      </g>
      <circle className="phase-glyph-core" cx="14" cy="14" r="5.5" fill="#F4C54A" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      <circle className="phase-glyph-halo" cx="14" cy="14" r="11" fill="#A78BFA" opacity="0.35" />
      <path d="M18 6 A 9 9 0 1 0 22 18 A 7 7 0 0 1 18 6 Z" fill="#6D3FC0" />
      <circle className="phase-glyph-star-a" cx="6"  cy="8"  r="0.9" fill="#C4B5FD" />
      <circle className="phase-glyph-star-b" cx="24" cy="6"  r="0.7" fill="#C4B5FD" />
      <circle className="phase-glyph-star-c" cx="5"  cy="20" r="0.8" fill="#C4B5FD" />
    </svg>
  );
}

function MenstrualIcon() {
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      <circle className="phase-glyph-halo" cx="14" cy="14" r="10" fill="#F87171" opacity="0.25" />
      <path d="M14 4 C10 8, 6 12, 6 16 a8 8 0 0 0 16 0 C22 12 18 8 14 4 Z" fill="#F87171" />
      <path d="M14 10 C12 13, 10 15, 10 17 a4 4 0 0 0 8 0 C18 15 16 13 14 10 Z" fill="#FCA5A5" opacity="0.6" />
    </svg>
  );
}

const PHASE_ICONS: Record<string, React.ReactNode> = {
  follicular: <SproutIcon />,
  ovulation:  <SunIcon />,
  luteal:     <MoonIcon />,
  menstrual:  <MenstrualIcon />,
};

const PHASE_LABEL_COPY: Record<string, string> = {
  follicular: "Follicular Phase",
  ovulation:  "Ovulation",
  luteal:     "Luteal Phase",
  menstrual:  "Menstrual Phase",
};

export default function PhaseCard({ phase, description, cycleDay, className = "" }: PhaseCardProps) {
  const style = PHASE_STYLE[phase] ?? PHASE_STYLE.follicular;
  const labelCopy = PHASE_LABEL_COPY[phase] ?? phase;

  return (
    <div
      className={`relative rounded-[22px] p-3.5 flex items-center gap-3 shadow-soft overflow-hidden ${className}`}
      style={{ background: style.bg, border: `1px solid ${style.border}` }}
    >
      {/* decorative orb */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${style.iconBg} 0%, transparent 70%)` }}
      />

      {/* animated phase icon */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: style.iconBg }}
      >
        {PHASE_ICONS[phase]}
      </div>

      {/* text */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-0.5" style={{ color: style.labelColor }}>
          Current Phase
        </p>
        <p className="font-display text-lg font-semibold italic text-dark leading-tight mb-0.5">
          {labelCopy}
        </p>
        <p className="text-[11px] text-text-mid leading-snug">{description}</p>
      </div>

      {/* day badge */}
      <div
        className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-xl"
        style={{ background: style.badgeBg, color: style.badgeColor }}
      >
        Day {cycleDay}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/PhaseCard.tsx
git commit -m "feat: add PhaseCard component with animated SVG phase icons"
```

---

## Task 4 — CycleRing component

**Files:**
- Create: `components/CycleRing.tsx`

- [ ] **Step 1: Create CycleRing.tsx**

The ring circumference at r=44 is `2π×44 ≈ 276.5`. Each phase arc length is proportional to its days in a 28-day cycle (default). The ring starts at 12 o'clock (transform="rotate(-90)").

```tsx
// components/CycleRing.tsx
"use client";

type CycleRingProps = {
  cycleDay: number;
  cycleLength?: number;
  periodLength?: number;     // menstrual days
  ovulationLength?: number;  // ovulation days
  size?: number;
};

const PHASE_COLORS = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

export default function CycleRing({
  cycleDay,
  cycleLength = 28,
  periodLength = 5,
  ovulationLength = 3,
  size = 108,
}: CycleRingProps) {
  const r = 44;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r; // ≈ 276.5

  // Phase day ranges
  const menstrualEnd  = periodLength;
  const follicularEnd = Math.round(cycleLength * 0.46);
  const ovulationEnd  = follicularEnd + ovulationLength;
  const lutealEnd     = cycleLength;

  const phases = [
    { key: "menstrual",  days: menstrualEnd,                color: PHASE_COLORS.menstrual,  from: 0 },
    { key: "follicular", days: follicularEnd - menstrualEnd, color: PHASE_COLORS.follicular, from: menstrualEnd },
    { key: "ovulation",  days: ovulationEnd - follicularEnd, color: PHASE_COLORS.ovulation,  from: follicularEnd },
    { key: "luteal",     days: lutealEnd - ovulationEnd,     color: PHASE_COLORS.luteal,     from: ovulationEnd },
  ];

  // Today marker angle — 0 days = 12 o'clock = -90deg in SVG
  const todayAngle = ((cycleDay - 1) / cycleLength) * 360 - 90;
  const todayRad   = (todayAngle * Math.PI) / 180;
  const todayX     = cx + r * Math.cos(todayRad);
  const todayY     = cy + r * Math.sin(todayRad);

  // Current phase for marker color
  let currentPhaseColor = PHASE_COLORS.follicular;
  if (cycleDay <= menstrualEnd) currentPhaseColor = PHASE_COLORS.menstrual;
  else if (cycleDay <= follicularEnd) currentPhaseColor = PHASE_COLORS.follicular;
  else if (cycleDay <= ovulationEnd) currentPhaseColor = PHASE_COLORS.ovulation;
  else currentPhaseColor = PHASE_COLORS.luteal;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {/* track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F5DEE2" strokeWidth="10" />
      {/* phase arcs */}
      {phases.map(p => {
        const arcLen    = (p.days / cycleLength) * circ;
        const offsetLen = (p.from / cycleLength) * circ;
        return (
          <circle
            key={p.key}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={p.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${arcLen - 2} ${circ - arcLen + 2}`}
            strokeDashoffset={-offsetLen}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
      })}
      {/* today dot */}
      <circle
        cx={todayX} cy={todayY} r="4"
        fill="white"
        stroke={currentPhaseColor}
        strokeWidth="2"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/CycleRing.tsx
git commit -m "feat: add CycleRing SVG component driven by real cycle data"
```

---

## Task 5 — MacroRing component

**Files:**
- Create: `components/MacroRing.tsx`

- [ ] **Step 1: Create MacroRing.tsx**

```tsx
// components/MacroRing.tsx
"use client";

type MacroRingProps = {
  consumed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
};

export default function MacroRing({ consumed, target, size = 68, strokeWidth = 5.5 }: MacroRingProps) {
  const r    = (size - strokeWidth * 2) / 2;
  const cx   = size / 2;
  const cy   = size / 2;
  const circ = 2 * Math.PI * r;
  const pct  = target > 0 ? Math.min(consumed / target, 1) : 0;
  const offset = circ * (1 - pct);
  const displayPct = Math.round(pct * 100);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F4B8C6" strokeWidth={strokeWidth} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={pct >= 1 ? "#34D399" : "#E8829A"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-accent text-[13px] font-bold text-dark leading-none">{displayPct}%</span>
        <span className="text-[8px] font-semibold uppercase tracking-wide text-text-dim mt-0.5">done</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/MacroRing.tsx
git commit -m "feat: add MacroRing circular progress component"
```

---

## Task 6 — Sparkline component

**Files:**
- Create: `components/Sparkline.tsx`

- [ ] **Step 1: Create Sparkline.tsx**

```tsx
// components/Sparkline.tsx
"use client";

type SparklineProps = {
  values: number[];           // array of 7 values (or fewer — will be left-padded with 0)
  labels?: string[];          // day labels e.g. ["Mon","Tue",...,"Sun"]
  todayIndex?: number;        // index of "today" bar (highlighted)
  title?: string;             // e.g. "Energy · 7 days"
  delta?: string;             // e.g. "+18%" shown top-right
  height?: number;            // bar area height in px
};

export default function Sparkline({
  values,
  labels,
  todayIndex,
  title,
  delta,
  height = 44,
}: SparklineProps) {
  const max = Math.max(...values, 1);
  const defaultLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const displayLabels = labels ?? defaultLabels.slice(-values.length);
  const todayIdx = todayIndex ?? values.length - 1;

  return (
    <div className="bg-surface rounded-[20px] px-4 py-3.5 shadow-card border border-[var(--color-border)]">
      {(title || delta) && (
        <div className="flex items-baseline justify-between mb-2">
          {title && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-dim">{title}</span>
          )}
          {delta && (
            <span className="font-accent text-sm font-bold text-primary">{delta}</span>
          )}
        </div>
      )}
      <div className="flex items-end gap-1.5" style={{ height }}>
        {values.map((v, i) => {
          const barH = Math.max((v / max) * height, 4);
          const isPeak = i === todayIdx || v === max;
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: barH,
                background: isPeak
                  ? "linear-gradient(180deg, #E8829A, #C96480)"
                  : "linear-gradient(180deg, #F4B8C6, #E8829A)",
                minWidth: 0,
              }}
            />
          );
        })}
      </div>
      {displayLabels.length > 0 && (
        <div className="flex gap-1.5 mt-1.5">
          {displayLabels.map((lbl, i) => (
            <span
              key={i}
              className="flex-1 text-center font-accent text-[8px] uppercase tracking-wide"
              style={{ color: i === todayIdx ? "#E8829A" : "var(--color-text-dim)", fontWeight: i === todayIdx ? 700 : 400 }}
            >
              {lbl}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Sparkline.tsx
git commit -m "feat: add Sparkline trend bar component"
```

---

## Task 7 — FocusCards component

**Files:**
- Create: `components/FocusCards.tsx`

This surfaces Train / Eat / Hydrate as priority focus cards on Dashboard. All three receive live data as props.

- [ ] **Step 1: Create FocusCards.tsx**

```tsx
// components/FocusCards.tsx
"use client";

type FocusCard = {
  icon: string;
  title: string;
  desc: string;
  active?: boolean;
};

type FocusCardsProps = {
  cards: FocusCard[];
};

export default function FocusCards({ cards }: FocusCardsProps) {
  return (
    <div className="flex gap-2">
      {cards.map((card, i) => (
        <div
          key={i}
          className="flex-1 rounded-[18px] px-2.5 py-3"
          style={
            card.active
              ? {
                  background: "linear-gradient(135deg, #E8829A, #C96480)",
                  border: "1px solid transparent",
                  boxShadow: "0 6px 20px rgba(232,130,154,0.40)",
                }
              : {
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 2px 10px rgba(180,80,100,0.08)",
                }
          }
        >
          <span className="text-xl mb-1.5 block">{card.icon}</span>
          <p
            className="text-xs font-bold mb-0.5"
            style={{ color: card.active ? "white" : "var(--color-text)" }}
          >
            {card.title}
          </p>
          <p
            className="text-[10px] leading-snug"
            style={{ color: card.active ? "rgba(255,255,255,0.85)" : "var(--color-text-mid)" }}
          >
            {card.desc}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/FocusCards.tsx
git commit -m "feat: add FocusCards component for dashboard priority actions"
```

---

## Task 8 — Dashboard redesign

**Files:**
- Modify: `app/dashboard/page.tsx`

Goals: upgrade the phase hero area to use `PhaseCard`, add stats row (day tile + mini stats grid), insert `FocusCards` section, strengthen the glow, and keep all existing intelligence/data below.

- [ ] **Step 1: Add imports and replace the phase hero section**

At top of file, add:
```tsx
import PhaseCard from "@/components/PhaseCard";
import FocusCards from "@/components/FocusCards";
```

- [ ] **Step 2: Strengthen the glow div**

Find the glow div (currently `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,130,154,0.12)...`):

```tsx
<div className="rose-glow fixed top-0 left-0 right-0 pointer-events-none z-0" />
```

- [ ] **Step 3: Replace the stats row section**

After the PhaseCard and before the WorkoutCard section, insert:

```tsx
{/* ── Stats row ── */}
<div className="flex gap-2 mb-3">
  {/* Day tile */}
  <div className="w-[76px] h-[76px] flex-shrink-0 bg-surface rounded-[18px] flex flex-col items-center justify-center shadow-card border border-[var(--color-border)]">
    <span className="font-accent text-2xl font-bold text-primary leading-none">{cycleDay}</span>
    <span className="text-[9px] font-semibold uppercase tracking-wide text-text-dim mt-0.5">of cycle</span>
  </div>
  {/* Mini stats grid */}
  <div className="flex-1 grid grid-cols-2 gap-2">
    {[
      { val: profile?.calculated_calories ?? phaseData.macros.protein * 4 + phaseData.macros.carbs * 4 + phaseData.macros.fats * 9,  lbl: "kcal goal" },
      { val: streak > 0 ? `${streak}` : "0", lbl: "day streak", flame: true },
      { val: Math.max(0, (profile?.cycle_length ?? 28) - cycleDay), lbl: "days left" },
      { val: `${profile?.calculated_protein ?? phaseData.macros.protein}g`, lbl: "protein" },
    ].map((s, i) => (
      <div key={i} className="bg-surface rounded-[14px] px-2.5 py-2 shadow-card border border-[var(--color-border)]">
        <p className="font-accent text-sm font-bold text-dark leading-none mb-0.5">
          {s.val}{s.flame && streak > 0 && <span className="flame-icon text-sm ml-0.5">🔥</span>}
        </p>
        <p className="text-[9px] font-semibold uppercase tracking-wide text-text-dim">{s.lbl}</p>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 4: Insert FocusCards from live data**

After the stats row, before the WorkoutCard:

```tsx
{/* ── Focus cards ── */}
<div className="mb-3">
  <div className="flex items-center justify-between mb-2">
    <h2 className="font-display text-[15px] font-semibold text-dark">Today&apos;s Focus</h2>
  </div>
  <FocusCards cards={[
    {
      icon: "💪",
      title: "Train",
      desc: (todayState?.workoutRecommendation?.type ?? phaseData.training).slice(0, 28),
      active: true,
    },
    {
      icon: "🥗",
      title: "Eat",
      desc: phaseData.nutritionFocus?.slice(0, 28) ?? "Phase nutrition",
    },
    {
      icon: "💧",
      title: "Hydrate",
      desc: `${waterGlasses} / ${(phaseData.phase === "menstrual" || phaseData.phase === "luteal") ? 9 : 8} glasses`,
    },
  ]} />
</div>
```

- [ ] **Step 5: Replace phase hero card with PhaseCard component**

Replace the existing phase hero `div` (the one with `PHASE_HERO_GRADIENT` background) with:

```tsx
{/* ── Phase card ── */}
<PhaseCard
  phase={phaseData.phase}
  label={phaseData.label}
  description={phaseData.trainingDetail?.split(".")[0] ?? phaseData.aiRecommendation?.split(".")[0] ?? ""}
  cycleDay={cycleDay}
  className="mb-3"
/>
```

Keep the phase transition card (day 1) and all cards below (WorkoutCard, AIRecommendation, etc.) intact.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: redesign Dashboard with PhaseCard, stats row, focus cards, and stronger glow"
```

---

## Task 9 — Meals redesign

**Files:**
- Modify: `app/meals/page.tsx`

Goals: Add MacroRing to the nutrition summary section, upgrade the macro pills, keep all logging functionality.

- [ ] **Step 1: Import MacroRing**

At top of `app/meals/page.tsx`:
```tsx
import MacroRing from "@/components/MacroRing";
```

- [ ] **Step 2: Find the nutrition summary section and upgrade it**

Find where `nutritionSummary` / `macroTargets` are rendered. Wrap them in the new premium card layout:

```tsx
{/* ── Macro summary card ── */}
<div className="bg-surface rounded-[22px] p-4 shadow-soft border border-[var(--color-border)] mb-3">
  {/* Top row: kcal + ring */}
  <div className="flex items-center justify-between mb-3">
    <div>
      <p className="font-accent text-[26px] font-bold text-dark leading-none tracking-tight">
        {Math.round(nutritionSummary?.kcal ?? 0).toLocaleString()}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-text-dim mt-0.5">Calories eaten</p>
      <p className="text-xs font-semibold text-primary mt-0.5">
        {Math.max(0, macroTargets.calories - Math.round(nutritionSummary?.kcal ?? 0))} kcal remaining
      </p>
    </div>
    <MacroRing
      consumed={Math.round(nutritionSummary?.kcal ?? 0)}
      target={macroTargets.calories}
    />
  </div>
  {/* Macro pills */}
  <div className="flex gap-2">
    {[
      { label: "Protein", consumed: Math.round(nutritionSummary?.protein ?? 0), target: macroTargets.protein, fill: "#E8829A" },
      { label: "Carbs",   consumed: Math.round(nutritionSummary?.carbs   ?? 0), target: macroTargets.carbs,   fill: "#F4B8C6" },
      { label: "Fat",     consumed: Math.round(nutritionSummary?.fats    ?? 0), target: macroTargets.fats,    fill: "#C96480" },
    ].map(m => {
      const pct = Math.min(m.consumed / Math.max(m.target, 1), 1);
      return (
        <div key={m.label} className="flex-1 rounded-xl p-2.5 text-center bg-[var(--color-ghost)]">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-text-dim mb-1">{m.label}</p>
          <p className="font-accent text-xs font-bold text-dark mb-1.5">{m.consumed}g</p>
          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "#F4B8C6" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct * 100}%`, background: m.fill }} />
          </div>
        </div>
      );
    })}
  </div>
</div>
```

- [ ] **Step 3: Add phase card to meals header**

After the page header, before the macro card, add:
```tsx
import PhaseCard from "@/components/PhaseCard";

// Then in JSX:
<PhaseCard
  phase={phase}
  label={phaseData.label}
  description={phaseData.nutritionFocus ?? "Phase nutrition guidance"}
  cycleDay={cycleDay}
  className="mb-3"
/>
```

- [ ] **Step 4: Strengthen glow**

At top of the meals page main div, add:
```tsx
<div className="rose-glow fixed top-0 left-0 right-0 pointer-events-none z-0" />
```

- [ ] **Step 5: Commit**

```bash
git add app/meals/page.tsx
git commit -m "feat: upgrade Meals with MacroRing, macro pills, PhaseCard, and glow"
```

---

## Task 10 — Training redesign

**Files:**
- Modify: `app/training/page.tsx`

Goals: Add a phase recommendation banner at top, upgrade exercise set-pills presentation.

- [ ] **Step 1: Import PhaseCard**

```tsx
import PhaseCard from "@/components/PhaseCard";
```

- [ ] **Step 2: Add phase card and recommendation banner to the top of the page content**

After the page header, add:

```tsx
{/* Phase card */}
<PhaseCard
  phase={phaseData.phase}
  label={phaseData.label}
  description={phaseData.trainingDetail?.split(".")[0] ?? phaseData.training}
  cycleDay={cycleDay}
  className="mb-3"
/>

{/* Phase training recommendation banner */}
<div
  className="flex items-start gap-3 rounded-[18px] p-3.5 mb-3"
  style={{
    background: "var(--color-surface)",
    borderLeft: `4px solid ${PHASE_COLOR[phaseData.phase] ?? "#E8829A"}`,
    border: `1px solid var(--color-border)`,
    borderLeftWidth: 4,
    borderLeftColor: PHASE_COLOR[phaseData.phase] ?? "#E8829A",
  }}
>
  <span className="text-2xl flex-shrink-0">
    {phaseData.phase === "menstrual" ? "🌙" : phaseData.phase === "follicular" ? "🌱" : phaseData.phase === "ovulation" ? "⚡" : "🍂"}
  </span>
  <div>
    <p className="text-sm font-bold text-dark mb-0.5">{phaseData.training}</p>
    <p className="text-xs text-text-mid leading-snug">{phaseData.trainingDetail?.split(".")[0]}.</p>
  </div>
</div>
```

- [ ] **Step 3: Upgrade the exercise set-pills appearance**

In the exercise rendering section, find where sets/reps/weight are shown. Update the pill style:

Each set pill should render as:
```tsx
<div className="flex-1 bg-[var(--color-ghost)] rounded-xl py-2 px-1.5 text-center">
  <p className="font-accent text-sm font-bold text-dark leading-none mb-0.5">{value}</p>
  <p className="text-[8px] font-semibold uppercase tracking-wide text-text-dim">{label}</p>
</div>
```

- [ ] **Step 4: Add glow**

```tsx
<div className="rose-glow fixed top-0 left-0 right-0 pointer-events-none z-0" />
```

- [ ] **Step 5: Commit**

```bash
git add app/training/page.tsx
git commit -m "feat: upgrade Training with PhaseCard, recommendation banner, and set-pills"
```

---

## Task 11 — Insights redesign

**Files:**
- Modify: `app/insights/page.tsx`

Goals: Add CycleRing and Sparkline to the overview tab. Wire to real data (workout energy trend, cycle position).

- [ ] **Step 1: Import components**

```tsx
import CycleRing from "@/components/CycleRing";
import Sparkline from "@/components/Sparkline";
```

- [ ] **Step 2: Compute sparkline data from real workout data**

After the existing analytics computations block, add:

```tsx
// 7-day energy sparkline — last 7 mood logs' energy scores
const last7Moods = moods.slice(0, 7).reverse();
const sparkValues = last7Moods.length > 0
  ? last7Moods.map(m => (m.energy as unknown as number) ?? 5)
  : [3, 4, 5, 6, 7, 7, 8]; // fallback visual

const sparkLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].slice(-Math.max(sparkValues.length, 7));

// Energy delta — compare last 3 to previous 3
const recentEnergy  = last7Moods.slice(-3).reduce((a, m) => a + ((m.energy as unknown as number) ?? 5), 0) / 3;
const previousEnergy = last7Moods.slice(0, 3).reduce((a, m) => a + ((m.energy as unknown as number) ?? 5), 0) / 3;
const energyDeltaPct = previousEnergy > 0 ? Math.round(((recentEnergy - previousEnergy) / previousEnergy) * 100) : 0;
const energyDeltaStr = energyDeltaPct >= 0 ? `+${energyDeltaPct}%` : `${energyDeltaPct}%`;
```

- [ ] **Step 3: Add cycle ring + sparkline to overview tab**

At the top of the overview tab content (before existing insight cards), insert:

```tsx
{/* ── Cycle ring card ── */}
<div className="bg-surface rounded-[22px] p-4 shadow-soft border border-[var(--color-border)] flex items-center gap-4 mb-3">
  <CycleRing
    cycleDay={cycleDay}
    cycleLength={profile?.cycle_length ?? 28}
    periodLength={profile?.period_length ?? 5}
    ovulationLength={profile?.ovulation_length ?? 3}
  />
  <div className="flex flex-col gap-2 flex-1">
    {[
      { label: "Menstrual",  color: "#F87171", days: "d1–5" },
      { label: "Follicular", color: "#34D399", days: `d6–${Math.round((profile?.cycle_length ?? 28) * 0.46)}` },
      { label: "Ovulation",  color: "#FBBF24", days: `+${profile?.ovulation_length ?? 3}d` },
      { label: "Luteal",     color: "#A78BFA", days: "→ end" },
    ].map(p => {
      const isCurrent = phaseData.phase === p.label.toLowerCase();
      return (
        <div key={p.label} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="font-semibold flex-1" style={{ color: isCurrent ? "#E8829A" : "var(--color-text)" }}>
            {p.label}
          </span>
          <span className="font-accent text-[10px] text-text-dim">{p.days}</span>
        </div>
      );
    })}
  </div>
</div>

{/* ── Energy sparkline ── */}
{last7Moods.length > 0 && (
  <div className="mb-3">
    <Sparkline
      values={sparkValues}
      labels={sparkLabels}
      title="Energy · 7 days"
      delta={energyDeltaStr}
    />
  </div>
)}
```

- [ ] **Step 4: Add glow and phase card to insights header**

```tsx
import PhaseCard from "@/components/PhaseCard";

// At top of page content:
<div className="rose-glow fixed top-0 left-0 right-0 pointer-events-none z-0" />
<PhaseCard
  phase={phaseData.phase}
  label={phaseData.label}
  description="Your cycle at a glance"
  cycleDay={cycleDay}
  className="mb-3"
/>
```

- [ ] **Step 5: Commit**

```bash
git add app/insights/page.tsx
git commit -m "feat: upgrade Insights with CycleRing, Sparkline, and PhaseCard"
```

---

## Task 12 — Profile redesign

**Files:**
- Modify: `app/profile/page.tsx`

Goals: Add a premium profile hero section at top, add stat tiles (cycles / streak / workouts), keep all settings and forms intact below.

- [ ] **Step 1: Add glow and profile hero**

At top of page content, before existing profile form:

```tsx
<div className="rose-glow fixed top-0 left-0 right-0 pointer-events-none z-0" />

{/* Profile hero */}
<div className="bg-surface rounded-[22px] p-4 shadow-soft border border-[var(--color-border)] flex items-center gap-4 mb-3">
  {/* Avatar */}
  <div
    className="w-16 h-16 rounded-full flex-shrink-0 p-[3px]"
    style={{ background: "linear-gradient(135deg, #E8829A, #C96480)" }}
  >
    <div
      className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
      style={{ background: avatarUrl ? "transparent" : "#FDE8ED" }}
    >
      {avatarUrl
        ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        : (
          <span className="font-display text-2xl font-semibold text-primary">
            {(name || "?").charAt(0).toUpperCase()}
          </span>
        )
      }
    </div>
  </div>
  {/* Info */}
  <div className="flex-1 min-w-0">
    <p className="font-display text-xl font-semibold text-dark leading-tight mb-0.5">
      {name || "Your Name"}
    </p>
    <p className="text-xs text-text-mid">
      {profile?.cycle_length ?? 28}-day cycle
      {profile?.period_start_date ? " · Tracking active" : ""}
    </p>
  </div>
</div>

{/* Stat tiles */}
<div className="grid grid-cols-3 gap-2 mb-3">
  {[
    { val: Math.max(0, Math.floor((workoutCount ?? 0) / (profile?.cycle_length ?? 28))), lbl: "Cycles logged" },
    { val: streak, lbl: "Day streak", flame: true },
    { val: workoutCount ?? 0, lbl: "Workouts" },
  ].map((s, i) => (
    <div key={i} className="bg-surface rounded-[16px] p-3 text-center shadow-card border border-[var(--color-border)]">
      <p className="font-accent text-lg font-bold text-dark leading-none mb-1">
        {s.val}{s.flame && streak > 0 && <span className="flame-icon text-sm ml-0.5">🔥</span>}
      </p>
      <p className="text-[8.5px] font-semibold uppercase tracking-wide text-text-dim">{s.lbl}</p>
    </div>
  ))}
</div>
```

- [ ] **Step 2: Upgrade settings group styling**

Wrap each settings section in a premium card:
```tsx
// Section container pattern
<div className="bg-surface rounded-[18px] shadow-card border border-[var(--color-border)] overflow-hidden mb-3">
  {/* rows */}
</div>
```

Each settings row:
```tsx
<div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-0">
  <div className="w-7 h-7 rounded-[9px] flex items-center justify-center text-sm flex-shrink-0"
    style={{ background: "#FDE8ED" }}>
    {icon}
  </div>
  <div className="flex-1">
    <p className="text-xs font-semibold text-dark">{title}</p>
    {subtitle && <p className="text-[10px] text-text-dim mt-0.5">{subtitle}</p>}
  </div>
  {control}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add app/profile/page.tsx
git commit -m "feat: upgrade Profile with hero section, stat tiles, and premium settings cards"
```

---

## Task 13 — BottomNav polish

**Files:**
- Modify: `components/BottomNav.tsx`

Minor updates: increase active state contrast, update border treatment.

- [ ] **Step 1: Update active nav item background and shadow**

```tsx
// Active item style
style={{ background: active ? "rgba(232,130,154,0.12)" : "transparent" }}

// Nav container — strengthen box shadow slightly
boxShadow: "0 8px 32px rgba(232,130,154,0.18), 0 2px 8px rgba(232,130,154,0.10)",
border: "1px solid rgba(244,184,198,0.5)",
```

- [ ] **Step 2: Commit**

```bash
git add components/BottomNav.tsx
git commit -m "feat: polish BottomNav shadow and active state for design v3"
```

---

## Self-review

### Spec coverage check
- ✅ Playfair Display + DM Sans — Task 1
- ✅ Stronger rose glow — Task 2 + applied in Tasks 8–12
- ✅ PhaseCard (animated SVG icons, phase-colored bg) — Task 3, used Tasks 8–11
- ✅ CycleRing — Task 4, used Task 11
- ✅ MacroRing — Task 5, used Task 9
- ✅ Sparkline — Task 6, used Task 11
- ✅ FocusCards — Task 7, used Task 8
- ✅ Dashboard redesign — Task 8
- ✅ Meals redesign — Task 9
- ✅ Training redesign — Task 10
- ✅ Insights redesign — Task 11
- ✅ Profile redesign — Task 12
- ✅ BottomNav polish — Task 13
- ✅ Mood tab not removed — not touched at all
- ✅ All Supabase wiring preserved — no data layer changes
- ✅ No static mock data introduced — all components accept live props

### Placeholder check
No TBDs, TODOs, or incomplete sections found.

### Type consistency
- `PhaseCard` props: `phase`, `label`, `description`, `cycleDay`, `className` — consistent across Tasks 3 and 8–11
- `CycleRing` props: `cycleDay`, `cycleLength`, `periodLength`, `ovulationLength`, `size` — used correctly in Task 11
- `MacroRing` props: `consumed`, `target`, `size`, `strokeWidth` — used correctly in Task 9
- `Sparkline` props: `values`, `labels`, `todayIndex`, `title`, `delta`, `height` — used correctly in Task 11
- `FocusCards` props: `cards: FocusCard[]` — used correctly in Task 8
