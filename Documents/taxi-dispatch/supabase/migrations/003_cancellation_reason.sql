-- Add cancellation reason to rides
alter table public.rides
  add column if not exists cancellation_reason text;
