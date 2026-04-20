# HerPhase Pre-Publish Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make HerPhase ready for full public launch by removing dev artifacts, adding a privacy policy, creating a branded 404 page, fixing the time-aware greeting, correcting the PWA manifest, and removing dead pro-gate code.

**Architecture:** All changes are isolated — no shared state, no new dependencies, no architectural changes. Each task is independently deployable. Tasks 1–3 are pure deletions/edits. Tasks 4–7 each touch one or two files.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase, existing CSS variables (`--color-surface`, `--color-text-rgb`, etc.), `font-body` / `font-display` font variables.

---

## File Map

| Status | File | Change |
|--------|------|--------|
| DELETE | `public/design-exploration*.html` (14 files) | Remove dev artifacts |
| DELETE | `public/mockup.html`, `nav-mockup.html`, `profile-mockup.html` | Remove dev artifacts |
| DELETE | `test_output.js`, `verify_spec.js`, `New folder` (root) | Remove dev artifacts |
| DELETE | `app/sentry-example-page/` | Remove test route |
| DELETE | `app/api/sentry-example-api/` | Remove test API route |
| MODIFY | `public/manifest.json` | Fix icon purpose fields |
| MODIFY | `app/prs/page.tsx:22-125` | Remove IS_PRO_FEATURE dead code |
| MODIFY | `app/dashboard/page.tsx:267` | Time-aware greeting |
| CREATE | `app/privacy/page.tsx` | Full privacy policy page |
| MODIFY | `app/auth/page.tsx:223` | Link to /privacy in footer |
| MODIFY | `app/profile/page.tsx:865-867` | Link to /privacy in footer |
| CREATE | `app/not-found.tsx` | Branded 404 page |

---

## Task 1: Remove Dev Artifacts

**Files:**
- Delete: `public/design-exploration.html` and 13 variants
- Delete: `public/mockup.html`, `public/nav-mockup.html`, `public/profile-mockup.html`
- Delete: `test_output.js`, `verify_spec.js`, `New folder` from project root
- Git-rm: bare `git` and `vercel` files (deleted from working tree, still tracked)
- Delete: `app/sentry-example-page/` directory
- Delete: `app/api/sentry-example-api/` directory

- [ ] **Step 1: Delete public dev HTML files**

```bash
cd Downloads/herphase
rm public/design-exploration.html \
   public/design-exploration-v2.html \
   public/design-exploration-v3.html \
   public/design-exploration-v4.html \
   public/design-exploration-v5.html \
   public/design-exploration-arc-timeline.html \
   public/design-exploration-combined.html \
   public/design-exploration-combined-v2.html \
   public/design-exploration-combined-v3.html \
   public/design-exploration-editorial-rose.html \
   public/design-exploration-perfect.html \
   public/design-exploration-profile.html \
   public/design-exploration-profile-v2.html \
   public/design-exploration-themes.html \
   public/mockup.html \
   public/nav-mockup.html \
   public/profile-mockup.html
```

- [ ] **Step 2: Delete root dev artifacts**

```bash
rm -f test_output.js verify_spec.js
rm -rf "New folder"
```

- [ ] **Step 3: Stage the already-deleted bare tracked files**

These files were deleted from the working tree but are still tracked in git:

```bash
git rm --cached git vercel 2>/dev/null || true
```

- [ ] **Step 4: Remove Sentry test routes**

```bash
rm -rf app/sentry-example-page app/api/sentry-example-api
```

- [ ] **Step 5: Verify nothing important was removed**

```bash
ls public/          # should show: icon-192.png, icon-512.png, manifest.json, sw.js
ls app/api/         # should show: push/ only
ls app/             # should NOT show: sentry-example-page
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove dev artifacts, design explorations, and Sentry test routes"
```

---

## Task 2: Fix PWA Manifest Icon Purpose

**Files:**
- Modify: `public/manifest.json`

The W3C spec says `"any maskable"` as a combined value is not valid. Split each icon into two separate entries.

- [ ] **Step 1: Replace manifest.json icons array**

Open `public/manifest.json` and replace the `"icons"` array:

```json
{
  "name": "HerPhase — Cycle-Aware Fitness",
  "short_name": "HerPhase",
  "description": "Train smarter with your cycle.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F7F5F2",
  "theme_color": "#C48A97",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 2: Verify manifest is valid JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('public/manifest.json','utf8')); console.log('valid')"
```

Expected output: `valid`

- [ ] **Step 3: Commit**

```bash
git add public/manifest.json
git commit -m "fix: split PWA manifest icon purpose into separate any/maskable entries"
```

---

## Task 3: Remove IS_PRO_FEATURE Dead Code

**Files:**
- Modify: `app/prs/page.tsx` lines 22–125

The constant `IS_PRO_FEATURE = false` and the `if (IS_PRO_FEATURE)` block (lines 111–125) are dead code. Remove both.

- [ ] **Step 1: Delete the constant and the if-block**

In `app/prs/page.tsx`, remove these lines entirely:

```
// Line 22: // PRO GATE — flip to true when paywall is ready
// Line 23: const IS_PRO_FEATURE = false;
```

And remove this entire block (lines 110–125):

```tsx
  // PRO GATE UI
  if (IS_PRO_FEATURE) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 text-center pb-24">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="font-display text-2xl font-semibold text-dark mb-2">PR Tracker</h2>
        <p className="text-sm text-dark/50 font-body mb-6 max-w-xs">Track personal records and see which phase you're strongest in. Available in HerPhase Pro.</p>
        <button
          className="px-8 py-3.5 rounded-2xl font-semibold text-white text-sm"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
          onClick={() => router.push("/profile")}>
          Upgrade to Pro
        </button>
      </div>
    );
  }
```

- [ ] **Step 2: Verify the build still compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors related to `IS_PRO_FEATURE`.

- [ ] **Step 3: Commit**

```bash
git add app/prs/page.tsx
git commit -m "chore: remove IS_PRO_FEATURE dead code from PRs page"
```

---

## Task 4: Time-Aware Greeting

**Files:**
- Modify: `app/dashboard/page.tsx` (around line 267)

- [ ] **Step 1: Add the getGreeting helper above the component**

In `app/dashboard/page.tsx`, add this function after the constant declarations at the top of the file (after the `PHASE_EMOJIS_DASH` block, before `readinessLabel`):

```ts
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
```

- [ ] **Step 2: Replace the hardcoded "Good morning" string**

Find this line in the dashboard header (around line 267):

```tsx
<p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#B8788A" }}>Good morning</p>
```

Replace with:

```tsx
<p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#B8788A" }}>{getGreeting()}</p>
```

- [ ] **Step 3: Verify manually**

Run `npm run dev`, open the dashboard. The greeting should match the current time of day. To test other times, temporarily hardcode `new Date().getHours()` to 8 (morning), 14 (afternoon), 20 (evening) and verify each label, then revert.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: time-aware greeting on dashboard (morning/afternoon/evening)"
```

---

## Task 5: Create Privacy Policy Page

**Files:**
- Create: `app/privacy/page.tsx`

This is a server component (no `"use client"` needed — purely static content).

- [ ] **Step 1: Create app/privacy/page.tsx with full content**

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Privacy Policy — HerPhase",
  description: "How HerPhase collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div
        className="fixed top-0 left-0 right-0 h-48 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,130,154,0.12) 0%, transparent 70%)" }}
      />
      <main className="relative z-10 mx-auto max-w-app px-4 pt-6 pb-16">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold mb-6 transition-colors"
          style={{ color: "var(--color-text-dim)" }}
        >
          ← Back
        </Link>

        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl shadow-soft"
            style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
          >
            🌸
          </div>
          <h1 className="font-display text-2xl font-semibold text-dark">Privacy Policy</h1>
          <p className="text-secondary text-sm font-body mt-1">Last updated: April 2026</p>
        </div>

        <div className="space-y-3">
          <PolicySection title="What we collect">
            <p>HerPhase collects the following data to personalise your experience:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>Menstrual cycle dates and history</li>
              <li>Mood logs — mood rating, energy level, physical symptoms, cravings, and sleep quality</li>
              <li>Workout logs — exercises, sets, reps, and weights</li>
              <li>Meal entries — food names and macro nutrition data (calories, protein, carbs, fats)</li>
              <li>Weight logs and daily hydration logs</li>
              <li>Body metrics — height, weight, age, and activity level (used to calculate macro targets)</li>
              <li>Push notification subscription tokens</li>
            </ul>
            <p className="mt-1">All data is stored securely in Supabase and linked to your account.</p>
          </PolicySection>

          <PolicySection title="How we use your data">
            <p>Your data is used solely to personalise training recommendations, nutrition targets, and cycle insights within HerPhase. We do not use your data for advertising, profiling, or any purpose beyond providing the features of this app.</p>
          </PolicySection>

          <PolicySection title="Third-party services">
            <p>HerPhase uses two third-party services that may process your data:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><strong className="font-semibold text-dark/80">Supabase</strong> — database hosting and authentication. Your data is stored on Supabase infrastructure.</li>
              <li><strong className="font-semibold text-dark/80">Sentry</strong> — crash reporting. Sentry receives error logs and stack traces to help us fix bugs. No personal health data is intentionally included in error reports.</li>
            </ul>
          </PolicySection>

          <PolicySection title="Data sharing">
            <p>We do not sell, rent, or share your personal data with any third party beyond the processors listed above. Your health data is never used for advertising or shared with advertisers.</p>
          </PolicySection>

          <PolicySection title="Your rights">
            <p>You have the right to access, correct, or delete your personal data at any time.</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><strong className="font-semibold text-dark/80">Delete:</strong> You can delete your account and all associated data from the Profile page. Deletion is permanent.</li>
              <li><strong className="font-semibold text-dark/80">Access / export:</strong> Data export is not currently supported in-app. To request a copy of your data, email us at the address below.</li>
              <li><strong className="font-semibold text-dark/80">Correction:</strong> You can update your profile, cycle data, and body metrics at any time within the app.</li>
            </ul>
          </PolicySection>

          <PolicySection title="Data retention">
            <p>Your data is retained until you delete your account. Upon deletion, all personal data associated with your account is permanently removed from our systems within 30 days.</p>
          </PolicySection>

          <PolicySection title="Cookies and tracking">
            <p>HerPhase uses a single Supabase authentication session cookie to keep you logged in. We do not use advertising cookies, tracking pixels, or third-party analytics.</p>
          </PolicySection>

          <PolicySection title="Children's privacy">
            <p>HerPhase is not intended for users under the age of 16. We do not knowingly collect data from minors. If you believe a minor has created an account, contact us and we will delete it promptly.</p>
          </PolicySection>

          <PolicySection title="Changes to this policy">
            <p>If we make material changes to this privacy policy, we will notify you via an in-app notice. Continued use of HerPhase after notification constitutes acceptance of the updated policy.</p>
          </PolicySection>
        </div>

        <div className="mt-6 bg-surface rounded-2xl p-4 shadow-card text-center">
          <p className="text-xs font-body mb-1" style={{ color: "var(--color-text-dim)" }}>Questions about your data?</p>
          <a
            href="mailto:wiralabs.studio@gmail.com"
            className="text-sm font-semibold"
            style={{ color: "#C48A97" }}
          >
            wiralabs.studio@gmail.com
          </a>
        </div>

        <p className="text-center text-xs mt-6 font-body" style={{ color: "var(--color-text-dim)" }}>
          HerPhase · Cycle-aware fitness
        </p>
      </main>
    </div>
  );
}

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-card">
      <h2 className="text-sm font-semibold text-dark mb-2">{title}</h2>
      <div className="text-xs font-body leading-relaxed space-y-1" style={{ color: "rgba(var(--color-text-rgb), 0.6)" }}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders**

Open `http://localhost:3000/privacy` in the browser. Check:
- Header gradient and 🌸 icon visible
- All 9 sections render with correct text
- Contact email link works (opens mail client)
- "← Back" link navigates to /dashboard

- [ ] **Step 3: Commit**

```bash
git add app/privacy/page.tsx
git commit -m "feat: add privacy policy page at /privacy"
```

---

## Task 6: Link Privacy Policy from Auth and Profile Pages

**Files:**
- Modify: `app/auth/page.tsx` line 223
- Modify: `app/profile/page.tsx` around line 865

### Auth page

- [ ] **Step 1: Replace the footer text in app/auth/page.tsx**

Find line 223:

```tsx
<p className="text-center text-xs text-dark/25 mt-6 font-body">HerPhase · Your data stays private</p>
```

Replace with:

```tsx
<p className="text-center text-xs text-dark/25 mt-6 font-body">
  HerPhase · Your data stays private ·{" "}
  <a href="/privacy" className="underline hover:text-dark/50 transition-colors">
    Privacy Policy
  </a>
</p>
```

### Profile page

- [ ] **Step 2: Add privacy link to app/profile/page.tsx**

Find the closing tags at the bottom of `<main>` (lines 865–867):

```tsx
          </div>
        </div>

      </main>
```

Insert a footer line before `</main>`:

```tsx
          </div>
        </div>

        <p className="text-center text-xs mt-6 mb-2 font-body" style={{ color: "var(--color-text-dim)" }}>
          <a href="/privacy" className="underline hover:opacity-70 transition-opacity">
            Privacy Policy
          </a>
        </p>

      </main>
```

- [ ] **Step 3: Verify both links**

- Open `/auth` — footer should read "HerPhase · Your data stays private · Privacy Policy" with the last part as a clickable link.
- Open `/profile`, scroll to the bottom — "Privacy Policy" link should appear below the Sign out button.
- Click both links — both should navigate to `/privacy`.

- [ ] **Step 4: Commit**

```bash
git add app/auth/page.tsx app/profile/page.tsx
git commit -m "feat: link to privacy policy from auth and profile footers"
```

---

## Task 7: Branded 404 Page

**Files:**
- Create: `app/not-found.tsx`

Next.js 14 automatically serves `app/not-found.tsx` for unmatched routes. No router config needed. This is a server component — no `"use client"`.

- [ ] **Step 1: Create app/not-found.tsx**

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-4">
      <div
        className="fixed top-0 left-0 right-0 h-72 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,130,154,0.12) 0%, transparent 70%)" }}
      />
      <div className="relative z-10 text-center">
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-3xl shadow-soft"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
        >
          🌸
        </div>
        <p
          className="text-xs font-bold uppercase tracking-widest mb-2"
          style={{ color: "#C48A97" }}
        >
          404
        </p>
        <h1 className="font-display text-2xl font-semibold text-dark mb-2">
          Page not found
        </h1>
        <p className="text-sm font-body mb-8" style={{ color: "var(--color-text-dim)" }}>
          This page doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-8 py-3.5 rounded-2xl font-semibold text-white text-sm shadow-soft transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
        >
          ← Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the 404 page**

Navigate to `http://localhost:3000/this-does-not-exist`. Check:
- HerPhase icon and gradient background visible
- "404" label in pink
- "Page not found" heading
- "← Go to Dashboard" button navigates to `/dashboard`
- No BottomNav visible (user may be unauthenticated)

- [ ] **Step 3: Commit**

```bash
git add app/not-found.tsx
git commit -m "feat: add branded 404 page"
```

---

## Self-Review Checklist

- [x] **Cleanup (spec §1):** Task 1 covers all 17 public files, root artifacts, and both Sentry routes.
- [x] **Privacy policy (spec §2):** Task 5 creates `/privacy`, Task 6 links from auth + profile. Contact email `wiralabs.studio@gmail.com` is in the page. All 9 policy sections are present.
- [x] **404 page (spec §3):** Task 7 creates `app/not-found.tsx` with the correct design.
- [x] **Time-aware greeting (spec §4):** Task 4 adds `getGreeting()` and replaces the hardcoded string.
- [x] **PWA manifest (spec §5):** Task 2 splits both icons into separate `any` and `maskable` entries.
- [x] **IS_PRO_FEATURE dead code (spec §6):** Task 3 removes constant and the entire if-block.
- [x] **No placeholders:** All steps have complete code.
- [x] **Type consistency:** `PolicySection` props match usage. `getGreeting` return type is `string`. No cross-task type dependencies.
