# TaxiBase — Taxi Dispatch Platform MVP Design Spec

**Date:** 2026-05-19  
**Product:** TaxiBase — white-label Uber-like taxi dispatch platform for local taxi companies  
**Stack:** Next.js App Router · TypeScript · Tailwind CSS · Supabase · Google Maps · PWA  
**Deployment:** Vercel  
**Project location:** `Documents/taxi-dispatch`

---

## 1. Product Overview

TaxiBase is a production-ready MVP for a white-label taxi dispatch operating system targeting existing local taxi companies. It is not a global ride-hailing competitor — it is a practical modernization tool focused on dispatch efficiency, real-time ride management, driver tracking, and reducing missed calls.

**Three audiences:**
- **Customers** — request rides via mobile-first PWA
- **Drivers** — receive assignments and update status via mobile-first PWA
- **Dispatchers / Admins** — manage all operations via desktop-first dashboard

**What it is NOT:** AI dispatch, subscriptions, loyalty, ratings, surge pricing, pooling, food delivery, crypto.

---

## 2. Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14+ App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Maps | Google Maps API |
| PWA | next-pwa or custom service worker |
| Deployment | Vercel |

---

## 3. Architecture

**Single Next.js app with route groups.** One codebase, one Vercel deployment. Route groups create separate layout shells per role. Middleware enforces role-based access at the edge.

### 3.1 Project Structure

```
app/
  (public)/
    page.tsx               # landing
    login/page.tsx
    register/page.tsx
  (customer)/
    layout.tsx             # mobile-first shell
    dashboard/page.tsx
    request/page.tsx
    ride/[id]/page.tsx
    history/page.tsx
    profile/page.tsx
  (driver)/
    layout.tsx             # mobile-first shell
    dashboard/page.tsx
    ride/[id]/page.tsx
    history/page.tsx
    profile/page.tsx
  (dispatcher)/
    layout.tsx             # desktop-first shell
    dashboard/page.tsx
    rides/page.tsx
    drivers/page.tsx
    customers/page.tsx
    analytics/page.tsx
    settings/page.tsx
components/
  RideCard.tsx
  DriverCard.tsx
  RideStatusBadge.tsx
  DriverStatusBadge.tsx
  ActiveRideTimeline.tsx
  PriceEstimateCard.tsx
  DashboardShell.tsx
  RoleGuard.tsx
  MapView.tsx
  Sidebar.tsx
  Topbar.tsx
  DriverMarker.tsx
  RideQueue.tsx
  DispatcherPanel.tsx
context/
  AppContext.tsx
  RealtimeContext.tsx
lib/
  supabase.ts              # client + server clients
  google-maps.ts           # Maps loader + helpers
  pricing.ts               # fare estimation logic
  types.ts                 # shared DB types
middleware.ts              # role-based route protection
public/
  manifest.json            # PWA manifest
  icons/                   # PWA icons
```

### 3.2 Auth & Role Routing

- Supabase Auth handles session management
- On login, `middleware.ts` reads `profiles.role` and redirects:
  - `customer` → `/customer/dashboard`
  - `driver` → `/driver/dashboard`
  - `dispatcher` → `/dispatcher/dashboard`
  - `admin` → `/dispatcher/dashboard`
- `RoleGuard` component provides page-level protection
- Unauthenticated users are redirected to `/login`

---

## 4. User Roles

| Role | Access |
|---|---|
| `customer` | Customer app only |
| `driver` | Driver app only |
| `dispatcher` | Dispatcher dashboard |
| `admin` | Dispatcher dashboard + settings |

---

## 5. Database Schema

### profiles
```sql
id         uuid primary key references auth.users(id)
role       text check (role in ('customer','driver','dispatcher','admin'))
full_name  text
phone      text
created_at timestamp default now()
```

### drivers
```sql
id                   uuid primary key default gen_random_uuid()
user_id              uuid references profiles(id)
car_model            text
car_plate            text
status               text check (status in ('offline','online','assigned','arriving','waiting','on_trip'))
current_lat          double precision
current_lng          double precision
heading              double precision
speed                double precision
last_location_update timestamp
is_active            boolean default true
created_at           timestamp default now()
```

### customers
```sql
id              uuid primary key default gen_random_uuid()
user_id         uuid references profiles(id)
default_pickup  text
created_at      timestamp default now()
```

### rides
```sql
id                   uuid primary key default gen_random_uuid()
customer_id          uuid references profiles(id)
driver_id            uuid references drivers(id)
pickup_address       text
pickup_lat           double precision
pickup_lng           double precision
destination_address  text
destination_lat      double precision
destination_lng      double precision
estimated_price      numeric
final_price          numeric
payment_method       text default 'cash'
status               text check (status in ('requested','assigned','driver_arriving','arrived','in_progress','completed','cancelled'))
notes                text
requested_at         timestamp default now()
assigned_at          timestamp
started_at           timestamp
completed_at         timestamp
cancelled_at         timestamp
```

### ride_events
```sql
id          uuid primary key default gen_random_uuid()
ride_id     uuid references rides(id)
event_type  text
message     text
created_by  uuid references profiles(id)
created_at  timestamp default now()
```

### driver_locations
```sql
id         uuid primary key default gen_random_uuid()
driver_id  uuid references drivers(id)
lat        double precision not null
lng        double precision not null
heading    double precision
speed      double precision
accuracy   double precision
created_at timestamp default now()
```

### company_settings
```sql
id            uuid primary key default gen_random_uuid()
company_name  text
phone         text
logo_url      text
primary_color text
base_fare     numeric
price_per_km  numeric
minimum_fare  numeric
currency      text default 'EUR'
created_at    timestamp default now()
```

**Row Level Security:** All tables have RLS enabled. Customers see only their own rides. Drivers see only assigned rides and their own data. Dispatchers/admins have full read/write access.

---

## 6. Feature Specifications

### 6.1 Customer App (mobile-first PWA)

- Register / login via Supabase Auth
- Enter pickup address with Google Places Autocomplete
- Enter destination address
- Use current GPS location for pickup
- Estimate fare (see pricing section)
- Request ride → creates `rides` row with status `requested`
- See assigned driver: name, car model, license plate
- Track driver on live Google Map
- Call driver (tel: link)
- Cancel ride (sets status `cancelled`)
- Ride history

### 6.2 Driver App (mobile-first PWA)

- Login via Supabase Auth
- Toggle online/offline (updates `drivers.status`)
- Share GPS location via `navigator.geolocation.watchPosition()`
- Receive assigned rides via Supabase Realtime
- Accept / reject ride (rejection sets ride status back to `requested` so dispatcher can reassign)
- Mark status transitions: assigned → arriving → arrived → in_progress → completed
- Call customer (tel: link)
- Ride history

### 6.3 Dispatcher Dashboard (desktop-first)

**Layout:** Dark theme, `#0f0f0f` background, `#FFD700` yellow accent, glassmorphism cards.

**Sections:**
- **Left sidebar:** icon nav (Dashboard, Rides, Drivers, Customers, Analytics, Settings)
- **Left panel:** ride queue with status-coloured cards, + New Ride button
- **Center:** live Google Map — driver markers (colour-coded by status), pickup pins, destination pins, route polylines
- **Right panel:** selected ride detail — customer info, route, estimated fare, payment method, assign driver dropdown, Assign button, Call Customer button
- **Bottom strip:** scrollable online driver cards with status indicators

**Features:**
- See all pending / assigned / active rides in realtime
- Create ride manually (from phone call) via modal form
- Assign ride to driver from dropdown
- Update ride status
- Cancel rides
- View customer and driver details
- See realtime driver positions on map

---

## 7. Realtime Architecture

```
Driver phone (watchPosition)
  └─► driver app sends location update
        ├─► UPDATE drivers SET current_lat, current_lng, heading, speed
        └─► INSERT driver_locations (historical log)
              └─► Supabase Realtime: drivers table
                    ├─► Dispatcher: moves Google Map marker live
                    └─► Customer: moves assigned driver marker live

Ride status change (driver or dispatcher)
  └─► UPDATE rides SET status, [timestamp fields]
        └─► Supabase Realtime: rides table
              ├─► Customer: updates status display
              ├─► Driver: confirms transition
              └─► Dispatcher: updates ride card colour/state
```

**Realtime channels per app:**
- Dispatcher: subscribes to all `rides` + all `drivers`
- Customer: subscribes to their active ride + assigned driver's location
- Driver: subscribes to incoming ride assignments

---

## 8. GPS Tracking Logic

Driver phone is the GPS device. The driver app uses `navigator.geolocation.watchPosition()`.

**Update intervals (controlled by `useGPSTracking` hook):**

| Driver status | Interval |
|---|---|
| online (no ride) | 20 seconds |
| assigned | 10 seconds |
| arriving | 5 seconds |
| in_progress | 3 seconds |

Payload per update: `{ lat, lng, heading, speed, accuracy, timestamp }`

Latest position stored in `drivers` table. Full history stored in `driver_locations`.

---

## 9. Pricing

```
estimatedPrice = baseFare + (distanceKm × pricePerKm)
if estimatedPrice < minimumFare: use minimumFare
```

- Calculated client-side using Google Maps Distance Matrix API
- Values sourced from `company_settings` table
- Cash only for MVP; card payment to be added post-MVP

---

## 10. PWA Configuration

- `manifest.json` with TaxiBase branding, icons, `display: standalone`
- Service worker for offline shell caching
- Mobile viewport meta tags on all customer/driver pages
- `theme-color: #FFD700`

---

## 11. Build Order (MVP)

1. Supabase schema + RLS policies
2. Supabase Auth + role-based routing + middleware
3. Customer: request ride flow
4. Dispatcher: see ride requests + assign driver
5. Driver: see assigned ride + accept/reject
6. Driver: status update flow (arriving → arrived → in_progress → completed)
7. Customer: realtime ride status updates
8. Driver: GPS tracking (`useGPSTracking` hook)
9. Dispatcher: live map with driver markers
10. Customer: live driver tracking on map
11. Dispatcher: create ride manually
12. Ride history (all roles)
13. Company settings page

---

## 12. Out of Scope (MVP)

- AI dispatch
- Subscriptions or billing
- Loyalty / ratings / reviews
- Surge pricing
- Advanced analytics
- Food delivery / pooling / multi-stop
- Card payments
- Push notifications (post-MVP)
- Multi-company / multi-tenant (white-label config is in schema, UI is post-MVP)
