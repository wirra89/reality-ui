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

create policy "profiles: own read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);

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

create policy "drivers: own read/write" on public.drivers
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "drivers: customer read assigned" on public.drivers for select
  using (exists (
    select 1 from public.rides r
    where r.driver_id = drivers.id
      and r.customer_id = auth.uid()
      and r.status not in ('completed','cancelled')
  ));

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

create policy "rides: customer own" on public.rides
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "rides: driver assigned" on public.rides for select
  using (exists (
    select 1 from public.drivers d
    where d.id = rides.driver_id and d.user_id = auth.uid()
  ));

create policy "rides: driver update" on public.rides for update
  using (exists (
    select 1 from public.drivers d
    where d.id = rides.driver_id and d.user_id = auth.uid()
  ));

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

create policy "driver_locations: driver insert" on public.driver_locations for insert
  with check (exists (
    select 1 from public.drivers d where d.id = driver_locations.driver_id and d.user_id = auth.uid()
  ));

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

create policy "company_settings: public read" on public.company_settings for select using (true);

create policy "company_settings: admin write" on public.company_settings
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

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
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.rides;
alter publication supabase_realtime add table public.drivers;
alter publication supabase_realtime add table public.ride_events;
