-- Store browser push subscriptions for drivers
create table if not exists public.driver_push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  driver_id  uuid not null references public.drivers(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamp with time zone default now()
);

alter table public.driver_push_subscriptions enable row level security;

create policy "push_subs: driver own write" on public.driver_push_subscriptions
  using (exists (
    select 1 from public.drivers d where d.id = driver_push_subscriptions.driver_id and d.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.drivers d where d.id = driver_push_subscriptions.driver_id and d.user_id = auth.uid()
  ));

-- Edge function (service_role) needs to read subscriptions to send notifications
create policy "push_subs: service role read" on public.driver_push_subscriptions
  for select using (auth.role() = 'service_role');
