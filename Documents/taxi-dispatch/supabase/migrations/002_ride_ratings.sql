-- Add customer rating fields to rides
alter table public.rides
  add column if not exists customer_rating  smallint check (customer_rating between 1 and 5),
  add column if not exists rating_note      text;
