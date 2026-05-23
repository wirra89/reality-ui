-- Add scheduled_at to rides for pre-booked / scheduled rides
alter table public.rides
  add column if not exists scheduled_at timestamp with time zone;

-- Index for dispatcher to efficiently query upcoming scheduled rides
create index if not exists rides_scheduled_at_idx on public.rides (scheduled_at)
  where scheduled_at is not null;
