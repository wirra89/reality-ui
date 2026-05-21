# TaxiBase — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Next.js project, apply the full Supabase schema with RLS, wire Supabase Auth, and implement role-based middleware so each role lands on the correct app shell after login.

**Architecture:** Single Next.js 14 App Router app with route groups `(public)`, `(customer)`, `(driver)`, `(dispatcher)`. Edge middleware reads `profiles.role` from Supabase and redirects on every navigation. Shared Supabase server/client helpers live in `lib/`.

**Tech Stack:** Next.js 14 App Router · TypeScript strict · Tailwind CSS · Supabase JS v2 · @supabase/ssr · Jest · React Testing Library

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | dependencies |
| `tsconfig.json` | strict TS config |
| `tailwind.config.ts` | dark theme + yellow accent |
| `lib/supabase/client.ts` | browser Supabase client |
| `lib/supabase/server.ts` | server-side Supabase client (cookies) |
| `lib/supabase/middleware.ts` | session refresh helper |
| `lib/types.ts` | all DB row types + enums |
| `middleware.ts` | role-based redirect logic |
| `app/layout.tsx` | root layout (fonts, viewport) |
| `app/(public)/login/page.tsx` | login form |
| `app/(public)/register/page.tsx` | register form |
| `app/(customer)/layout.tsx` | customer mobile shell |
| `app/(driver)/layout.tsx` | driver mobile shell |
| `app/(dispatcher)/layout.tsx` | dispatcher desktop shell |
| `app/(customer)/dashboard/page.tsx` | customer stub |
| `app/(driver)/dashboard/page.tsx` | driver stub |
| `app/(dispatcher)/dashboard/page.tsx` | dispatcher stub |
| `components/RoleGuard.tsx` | client-side role check component |
| `supabase/migrations/001_initial_schema.sql` | full schema + RLS |

---

## Task 1: Scaffold Next.js project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `next.config.ts`
- Create: `.env.local.example`

- [ ] **Step 1: Create project**

```bash
cd "C:/Users/Wirra89/Documents"
npx create-next-app@latest taxi-dispatch \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
cd taxi-dispatch
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install mapbox-gl
npm install lucide-react
npm install -D @types/mapbox-gl jest @types/jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest
```

- [ ] **Step 3: Configure tsconfig.json**

Replace the contents of `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Configure tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        taxi: {
          yellow: '#FFD700',
          dark: '#0f0f0f',
          card: '#151515',
          border: '#2a2a2a',
          muted: '#555555',
        },
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 5: Create .env.local.example**

```bash
cat > .env.local.example << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token
EOF
```

Copy to `.env.local` and fill in real values from your Supabase project dashboard.

- [ ] **Step 6: Configure next.config.ts**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 7: Configure Jest**

Create `jest.config.ts`:

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

Create `jest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```

Expected: server running at http://localhost:3000 with no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind and Supabase deps"
```

---

## Task 2: Supabase schema + RLS

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create migrations directory**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Write migration**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('customer','driver','dispatcher','admin')),
  full_name  text,
  phone      text,
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- Users can read and update their own profile
create policy "profiles: own read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);

-- Dispatchers/admins can read all profiles
create policy "profiles: dispatcher read" on public.profiles for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('dispatcher','admin')
  ));

-- ============================================================
-- CUSTOMERS
-- ============================================================
create table public.customers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  default_pickup  text,
  created_at      timestamp with time zone default now()
);

alter table public.customers enable row level security;

create policy "customers: own read/write" on public.customers
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "customers: dispatcher read" on public.customers for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('dispatcher','admin')
  ));

-- ============================================================
-- DRIVERS
-- ============================================================
create table public.drivers (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  car_model            text,
  car_plate            text,
  status               text not null default 'offline'
                         check (status in ('offline','online','assigned','arriving','waiting','on_trip')),
  current_lat          double precision,
  current_lng          double precision,
  heading              double precision,
  speed                double precision,
  last_location_update timestamp with time zone,
  is_active            boolean not null default true,
  created_at           timestamp with time zone default now()
);

alter table public.drivers enable row level security;

-- Driver reads/updates their own record
create policy "drivers: own read/write" on public.drivers
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Customers can read driver info for their active ride
create policy "drivers: customer read assigned" on public.drivers for select
  using (exists (
    select 1 from public.rides r
    where r.driver_id = drivers.id
      and r.customer_id = auth.uid()
      and r.status not in ('completed','cancelled')
  ));

-- Dispatchers can read/write all drivers
create policy "drivers: dispatcher all" on public.drivers
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('dispatcher','admin')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('dispatcher','admin')
  ));

-- ============================================================
-- RIDES
-- ============================================================
create table public.rides (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid references public.profiles(id),
  driver_id           uuid references public.drivers(id),
  pickup_address      text,
  pickup_lat          double precision,
  pickup_lng          double precision,
  destination_address text,
  destination_lat     double precision,
  destination_lng     double precision,
  estimated_price     numeric,
  final_price         numeric,
  payment_method      text not null default 'cash',
  status              text not null default 'requested'
                        check (status in ('requested','assigned','driver_arriving','arrived','in_progress','completed','cancelled')),
  notes               text,
  requested_at        timestamp with time zone default now(),
  assigned_at         timestamp with time zone,
  started_at          timestamp with time zone,
  completed_at        timestamp with time zone,
  cancelled_at        timestamp with time zone
);

alter table public.rides enable row level security;

-- Customers see their own rides
create policy "rides: customer own" on public.rides
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- Drivers see rides assigned to them
create policy "rides: driver assigned" on public.rides for select
  using (exists (
    select 1 from public.drivers d
    where d.id = rides.driver_id and d.user_id = auth.uid()
  ));

-- Drivers can update status on their assigned rides
create policy "rides: driver update" on public.rides for update
  using (exists (
    select 1 from public.drivers d
    where d.id = rides.driver_id and d.user_id = auth.uid()
  ));

-- Dispatchers have full access
create policy "rides: dispatcher all" on public.rides
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('dispatcher','admin')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('dispatcher','admin')
  ));

-- ============================================================
-- RIDE EVENTS
-- ============================================================
create table public.ride_events (
  id         uuid primary key default gen_random_uuid(),
  ride_id    uuid not null references public.rides(id) on delete cascade,
  event_type text not null,
  message    text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

alter table public.ride_events enable row level security;

-- Anyone involved in the ride can read events
create policy "ride_events: read if involved" on public.ride_events for select
  using (exists (
    select 1 from public.rides r
    where r.id = ride_events.ride_id
      and (
        r.customer_id = auth.uid()
        or exists (select 1 from public.drivers d where d.id = r.driver_id and d.user_id = auth.uid())
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('dispatcher','admin'))
      )
  ));

-- Anyone involved can insert events
create policy "ride_events: insert if involved" on public.ride_events for insert
  with check (exists (
    select 1 from public.rides r
    where r.id = ride_events.ride_id
      and (
        r.customer_id = auth.uid()
        or exists (select 1 from public.drivers d where d.id = r.driver_id and d.user_id = auth.uid())
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('dispatcher','admin'))
      )
  ));

-- ============================================================
-- DRIVER LOCATIONS (history)
-- ============================================================
create table public.driver_locations (
  id         uuid primary key default gen_random_uuid(),
  driver_id  uuid not null references public.drivers(id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  heading    double precision,
  speed      double precision,
  accuracy   double precision,
  created_at timestamp with time zone default now()
);

alter table public.driver_locations enable row level security;

-- Drivers insert their own locations
create policy "driver_locations: driver insert" on public.driver_locations for insert
  with check (exists (
    select 1 from public.drivers d where d.id = driver_locations.driver_id and d.user_id = auth.uid()
  ));

-- Dispatchers can read all
create policy "driver_locations: dispatcher read" on public.driver_locations for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('dispatcher','admin')
  ));

-- ============================================================
-- COMPANY SETTINGS
-- ============================================================
create table public.company_settings (
  id            uuid primary key default gen_random_uuid(),
  company_name  text not null default 'TaxiBase',
  phone         text,
  logo_url      text,
  primary_color text default '#FFD700',
  base_fare     numeric not null default 2.00,
  price_per_km  numeric not null default 1.50,
  minimum_fare  numeric not null default 5.00,
  currency      text not null default 'EUR',
  created_at    timestamp with time zone default now()
);

alter table public.company_settings enable row level security;

-- Everyone can read settings (needed for fare estimation)
create policy "company_settings: public read" on public.company_settings for select using (true);

-- Only admins can write
create policy "company_settings: admin write" on public.company_settings
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Insert default settings row
insert into public.company_settings (company_name, base_fare, price_per_km, minimum_fare, currency)
values ('TaxiBase', 2.00, 1.50, 5.00, 'EUR');

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- REALTIME: enable on key tables
-- ============================================================
alter publication supabase_realtime add table public.rides;
alter publication supabase_realtime add table public.drivers;
alter publication supabase_realtime add table public.ride_events;
```

- [ ] **Step 3: Apply migration via Supabase MCP**

In your Supabase project, run the SQL above via the SQL editor at app.supabase.com, or apply via CLI:

```bash
# If using Supabase CLI
npx supabase db push
```

Expected: all 7 tables created, RLS enabled on all, default company_settings row inserted.

- [ ] **Step 4: Verify in Supabase dashboard**

Navigate to Table Editor → confirm tables: `profiles`, `customers`, `drivers`, `rides`, `ride_events`, `driver_locations`, `company_settings`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: Supabase schema with RLS policies and realtime"
```

---

## Task 3: Shared types + Supabase clients

**Files:**
- Create: `lib/types.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/pricing.ts`
- Create: `lib/pricing.test.ts`

- [ ] **Step 1: Write pricing tests first**

Create `lib/pricing.test.ts`:

```typescript
import { estimateFare } from './pricing'

describe('estimateFare', () => {
  const settings = { base_fare: 2, price_per_km: 1.5, minimum_fare: 5 }

  it('applies base fare + distance', () => {
    expect(estimateFare(4, settings)).toBe(8) // 2 + 4*1.5
  })

  it('returns minimum fare when calculated is lower', () => {
    expect(estimateFare(1, settings)).toBe(5) // 2 + 1.5 = 3.5 < 5
  })

  it('applies minimum fare when distance is zero', () => {
    expect(estimateFare(0, settings)).toBe(5)
  })

  it('handles fractional km', () => {
    expect(estimateFare(2.5, settings)).toBe(5.75) // 2 + 2.5*1.5 = 5.75
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest lib/pricing.test.ts
```

Expected: FAIL — `estimateFare` not found.

- [ ] **Step 3: Write types**

Create `lib/types.ts`:

```typescript
export type UserRole = 'customer' | 'driver' | 'dispatcher' | 'admin'

export type DriverStatus = 'offline' | 'online' | 'assigned' | 'arriving' | 'waiting' | 'on_trip'

export type RideStatus =
  | 'requested'
  | 'assigned'
  | 'driver_arriving'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  phone: string | null
  created_at: string
}

export interface Driver {
  id: string
  user_id: string
  car_model: string | null
  car_plate: string | null
  status: DriverStatus
  current_lat: number | null
  current_lng: number | null
  heading: number | null
  speed: number | null
  last_location_update: string | null
  is_active: boolean
  created_at: string
  // joined
  profile?: Profile
}

export interface Customer {
  id: string
  user_id: string
  default_pickup: string | null
  created_at: string
  profile?: Profile
}

export interface Ride {
  id: string
  customer_id: string | null
  driver_id: string | null
  pickup_address: string | null
  pickup_lat: number | null
  pickup_lng: number | null
  destination_address: string | null
  destination_lat: number | null
  destination_lng: number | null
  estimated_price: number | null
  final_price: number | null
  payment_method: string
  status: RideStatus
  notes: string | null
  requested_at: string
  assigned_at: string | null
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  // joined
  customer?: Profile
  driver?: Driver
}

export interface RideEvent {
  id: string
  ride_id: string
  event_type: string
  message: string | null
  created_by: string | null
  created_at: string
}

export interface DriverLocation {
  id: string
  driver_id: string
  lat: number
  lng: number
  heading: number | null
  speed: number | null
  accuracy: number | null
  created_at: string
}

export interface CompanySettings {
  id: string
  company_name: string
  phone: string | null
  logo_url: string | null
  primary_color: string
  base_fare: number
  price_per_km: number
  minimum_fare: number
  currency: string
  created_at: string
}

export interface FareSettings {
  base_fare: number
  price_per_km: number
  minimum_fare: number
}
```

- [ ] **Step 4: Write pricing implementation**

Create `lib/pricing.ts`:

```typescript
import type { FareSettings } from './types'

export function estimateFare(distanceKm: number, settings: FareSettings): number {
  const calculated = settings.base_fare + distanceKm * settings.price_per_km
  return Math.max(calculated, settings.minimum_fare)
}

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}
```

- [ ] **Step 5: Run pricing tests — expect pass**

```bash
npx jest lib/pricing.test.ts
```

Expected: 4 passing.

- [ ] **Step 6: Write browser Supabase client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 7: Write server Supabase client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component — cookie setting ignored
          }
        },
      },
    }
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add lib/
git commit -m "feat: shared types, Supabase clients, pricing logic"
```

---

## Task 4: Auth pages + middleware + role routing

**Files:**
- Create: `middleware.ts`
- Create: `app/layout.tsx`
- Create: `app/(public)/login/page.tsx`
- Create: `app/(public)/register/page.tsx`
- Create: `app/(customer)/layout.tsx`
- Create: `app/(driver)/layout.tsx`
- Create: `app/(dispatcher)/layout.tsx`
- Create: `app/(customer)/dashboard/page.tsx`
- Create: `app/(driver)/dashboard/page.tsx`
- Create: `app/(dispatcher)/dashboard/page.tsx`
- Create: `components/RoleGuard.tsx`

- [ ] **Step 1: Write middleware**

Create `middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/register']
const ROLE_HOME: Record<string, string> = {
  customer:   '/customer/dashboard',
  driver:     '/driver/dashboard',
  dispatcher: '/dispatcher/dashboard',
  admin:      '/dispatcher/dashboard',
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Not logged in — only allow public paths
  if (!user) {
    if (PUBLIC_PATHS.includes(path)) return supabaseResponse
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in — redirect away from public paths to role home
  if (PUBLIC_PATHS.includes(path)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const home = ROLE_HOME[profile?.role ?? 'customer']
    return NextResponse.redirect(new URL(home, request.url))
  }

  // Enforce role-based path access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'customer'

  if (path.startsWith('/customer') && !['customer'].includes(role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
  }
  if (path.startsWith('/driver') && !['driver'].includes(role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
  }
  if (path.startsWith('/dispatcher') && !['dispatcher', 'admin'].includes(role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 2: Write root layout**

Create `app/layout.tsx`:

```typescript
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TaxiBase',
  description: 'Modern taxi dispatch platform',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#FFD700',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-taxi-dark text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

Create `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    color-scheme: dark;
  }
  body {
    @apply bg-taxi-dark text-white;
  }
}
```

- [ ] **Step 3: Write login page**

Create `app/(public)/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-taxi-yellow rounded-lg" />
          <span className="text-xl font-bold tracking-widest text-taxi-yellow">TAXIBASE</span>
        </div>

        <h1 className="text-2xl font-bold mb-2">Sign in</h1>
        <p className="text-taxi-muted mb-6 text-sm">Enter your credentials to continue</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-taxi-yellow text-black font-bold py-3 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-taxi-muted text-sm text-center mt-6">
          No account?{' '}
          <a href="/register" className="text-taxi-yellow hover:underline">Register</a>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write register page**

Create `app/(public)/register/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('customer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Update phone separately after profile is created
    if (phone) {
      await supabase.from('profiles').update({ phone }).eq('id', (await supabase.auth.getUser()).data.user!.id)
    }

    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-taxi-yellow rounded-lg" />
          <span className="text-xl font-bold tracking-widest text-taxi-yellow">TAXIBASE</span>
        </div>

        <h1 className="text-2xl font-bold mb-2">Create account</h1>
        <p className="text-taxi-muted mb-6 text-sm">Join TaxiBase</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
              placeholder="+381 ..."
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
              placeholder="Min. 8 characters"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">I am a</label>
            <div className="grid grid-cols-2 gap-2">
              {(['customer', 'driver'] as UserRole[]).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-3 rounded-lg text-sm font-medium capitalize border transition ${
                    role === r
                      ? 'bg-taxi-yellow text-black border-taxi-yellow'
                      : 'bg-taxi-card text-taxi-muted border-taxi-border hover:border-taxi-yellow'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-taxi-yellow text-black font-bold py-3 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-taxi-muted text-sm text-center mt-6">
          Have an account?{' '}
          <a href="/login" className="text-taxi-yellow hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write RoleGuard component**

Create `components/RoleGuard.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

interface RoleGuardProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || !allowedRoles.includes(profile.role as UserRole)) {
        router.push('/login')
        return
      }

      setAuthorized(true)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-taxi-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
```

- [ ] **Step 6: Write app shell layouts**

Create `app/(customer)/layout.tsx`:

```typescript
import { RoleGuard } from '@/components/RoleGuard'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['customer']}>
      <div className="min-h-screen max-w-md mx-auto">
        {children}
      </div>
    </RoleGuard>
  )
}
```

Create `app/(driver)/layout.tsx`:

```typescript
import { RoleGuard } from '@/components/RoleGuard'

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['driver']}>
      <div className="min-h-screen max-w-md mx-auto">
        {children}
      </div>
    </RoleGuard>
  )
}
```

Create `app/(dispatcher)/layout.tsx`:

```typescript
import { RoleGuard } from '@/components/RoleGuard'

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['dispatcher', 'admin']}>
      <div className="min-h-screen">
        {children}
      </div>
    </RoleGuard>
  )
}
```

- [ ] **Step 7: Write dashboard stubs**

Create `app/(customer)/dashboard/page.tsx`:

```typescript
export default function CustomerDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-taxi-yellow">Customer Dashboard</h1>
      <p className="text-taxi-muted mt-2">Plan 2 will fill this in.</p>
    </div>
  )
}
```

Create `app/(driver)/dashboard/page.tsx`:

```typescript
export default function DriverDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-taxi-yellow">Driver Dashboard</h1>
      <p className="text-taxi-muted mt-2">Plan 2 will fill this in.</p>
    </div>
  )
}
```

Create `app/(dispatcher)/dashboard/page.tsx`:

```typescript
export default function DispatcherDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-taxi-yellow">Dispatcher Dashboard</h1>
      <p className="text-taxi-muted mt-2">Plan 2 will fill this in.</p>
    </div>
  )
}
```

- [ ] **Step 8: Add PWA manifest stub**

Create `public/manifest.json`:

```json
{
  "name": "TaxiBase",
  "short_name": "TaxiBase",
  "description": "Modern taxi dispatch platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0f0f",
  "theme_color": "#FFD700",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 9: End-to-end smoke test**

```bash
npm run dev
```

1. Open http://localhost:3000 → should redirect to `/login`
2. Register a customer account → should redirect to `/customer/dashboard`
3. Log out, register a driver account → should redirect to `/driver/dashboard`
4. Log out, log back in as customer → should redirect to `/customer/dashboard`
5. Manually navigate to `/dispatcher/dashboard` as customer → should redirect back

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: auth, middleware, role-based routing, app shell layouts"
```

---

## ✅ Plan 1 Complete

At this point you have:
- Working Next.js project with Tailwind dark theme
- Full Supabase schema with RLS on all tables
- Supabase Auth with email/password
- Role-based middleware that routes each role to their app
- `RoleGuard` component for page-level protection
- Pricing logic with passing tests
- Stub pages for all three app shells

**Next:** Plan 2 — Core ride flow (customer request → dispatcher assign → driver accept → status updates)
