-- supabase/migrations/014_flow_intensity.sql
-- Adds optional flow intensity tracking to mood_logs.
-- Only populated during menstrual phase. NULL = not in period or not tracked.

ALTER TABLE mood_logs
  ADD COLUMN IF NOT EXISTS flow_intensity TEXT
  CONSTRAINT flow_intensity_values CHECK (
    flow_intensity IS NULL OR
    flow_intensity IN ('spotting', 'light', 'medium', 'heavy')
  );
