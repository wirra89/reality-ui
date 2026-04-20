# HerPhase — Pre-Publish Launch Design

**Date:** 2026-04-20
**Goal:** Make HerPhase ready for full public launch — free tier, no monetization at launch, single rose theme.
**Contact email (privacy policy):** wiralabs.studio@gmail.com

---

## Scope

Fix all blockers and polish issues identified in the pre-publish audit. Dark mode, monetization, SEO, and loading-state audits are explicitly out of scope for this pass.

---

## 1. Cleanup — Remove Dev Artifacts

### 1a. Delete from `/public`

These files are publicly accessible at production URLs and must be removed:

- `design-exploration.html`
- `design-exploration-v2.html`
- `design-exploration-v3.html`
- `design-exploration-v4.html`
- `design-exploration-v5.html`
- `design-exploration-arc-timeline.html`
- `design-exploration-combined.html`
- `design-exploration-combined-v2.html`
- `design-exploration-combined-v3.html`
- `design-exploration-editorial-rose.html`
- `design-exploration-perfect.html`
- `design-exploration-profile.html`
- `design-exploration-profile-v2.html`
- `design-exploration-themes.html`
- `mockup.html`
- `nav-mockup.html`
- `profile-mockup.html`

### 1b. Delete from project root

- `test_output.js`
- `verify_spec.js`
- `New folder` (empty dev artifact)
- Stage the already-deleted bare files `git` and `vercel` (no extension) via `git rm` — they are deleted from the working tree but still tracked.

### 1c. Remove Sentry test routes

Delete entire directories:
- `app/sentry-example-page/`
- `app/api/sentry-example-api/`

These are Sentry SDK scaffolded test routes, not for production use.

---

## 2. Privacy Policy Page

### Route
`/privacy` — rendered as a static Next.js page (`app/privacy/page.tsx`)

### Content
A real privacy policy covering HerPhase's actual data practices:

- **Data collected:** menstrual cycle dates and history, mood logs (mood, energy, symptoms, cravings, sleep), workout logs, meal entries with macros, weight logs, hydration logs, body metrics (height, weight, age, activity level), push notification subscriptions. All stored in Supabase.
- **Purpose:** Personalise training recommendations, nutrition targets, and cycle insights. No other use.
- **Third-party processors:** Supabase (database hosting, auth), Sentry (crash reporting only — no personal data sent).
- **Data sharing:** Never sold. Never shared with advertisers or any third party beyond the processors above.
- **Retention:** Data retained until account deletion. Users can delete their account and all associated data at any time from the Profile page.
- **User rights:** Right to access, correct, or delete personal data. Contact: wiralabs.studio@gmail.com.
- **Cookies:** Supabase auth session cookie only. No tracking pixels, no ad cookies.
- **Children:** Service not intended for users under 16.
- **Updates:** Policy changes communicated via in-app notice.

### Visual design
Matches HerPhase brand — rose/lavender gradient header, `font-body` / `font-display` fonts, `bg-background` page background, `bg-surface` content card, `shadow-card` styling.

### Links added
- Auth page (`app/auth/page.tsx`): replace "Your data stays private" footer text with "Your data stays private · [Privacy Policy](/privacy)"
- Profile page (`app/profile/page.tsx`): add "Privacy Policy" link to the page footer alongside Sign Out

---

## 3. Branded 404 Page

### File
`app/not-found.tsx` — Next.js automatically serves this for unmatched routes.

### Design
- HerPhase logo (🌸 icon, gradient background matching auth page)
- "404" eyebrow label in primary pink
- "Page not found" heading
- "This page doesn't exist or has moved." subtitle
- "← Go to Dashboard" button (gradient, links to `/dashboard`)
- No BottomNav (user may not be authenticated)
- Matches auth page visual style (centered, radial gradient background blob)

---

## 4. Time-Aware Greeting

### File
`app/dashboard/page.tsx` — line where `"Good morning"` is hardcoded.

### Logic
```ts
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
```

Replace the hardcoded string `"Good morning"` with `{getGreeting()}` in the dashboard header.

---

## 5. PWA Manifest Icon Fix

### File
`public/manifest.json`

### Change
Split each icon entry's `"purpose": "any maskable"` into two separate entries — one with `"purpose": "any"` and one with `"purpose": "maskable"`. This is the W3C-recommended pattern and fixes home screen rendering on Android Chrome.

```json
"icons": [
  { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
  { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
  { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
]
```

---

## 6. Remove IS_PRO_FEATURE Dead Code

### File
`app/prs/page.tsx`

### Change
Remove the `IS_PRO_FEATURE` constant (currently `false`) and any conditional blocks that reference it. The feature is fully enabled and the gate serves no purpose.

---

## Out of Scope

- Dark mode (single rose theme ships)
- Monetization / paywall (free at launch)
- New features
- Loading state consistency audit
- SEO meta tags / robots.txt
- Apple splash screens / touch icons beyond existing PWA setup
- Terms of Service (privacy policy covers the launch minimum)
