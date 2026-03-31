-- supabase/migrations/001_create_cycle_logs.sql
-- Run this in your Supabase SQL editor to set up the database

CREATE TABLE IF NOT EXISTS cycle_logs (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cycle_day  INTEGER NOT NULL CHECK (cycle_day >= 1 AND cycle_day <= 28),
  phase      TEXT NOT NULL CHECK (phase IN ('menstrual', 'follicular', 'ovulation', 'luteal'))
);

-- Index for fast time-based queries
CREATE INDEX IF NOT EXISTS idx_cycle_logs_created_at
  ON cycle_logs (created_at DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE cycle_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon key (MVP — no auth)
-- In production, replace with user-specific policies
CREATE POLICY "Allow all for anon" ON cycle_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);
