-- Migration: favorite_foods table
-- Run this in Supabase SQL Editor (Database > SQL Editor > New query).
-- The custom_foods use case is handled by the existing foods table
-- (is_global=false, created_by=user.id). food_logs already exist as
-- meal_logs + meal_log_entries.

CREATE TABLE IF NOT EXISTS favorite_foods (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_source TEXT        NOT NULL,   -- 'off', 'usda', 'hph', 'db', 'recent'
  food_id     TEXT        NOT NULL,   -- source-scoped id (barcode, fdcId, recipeId, uuid)
  food_data   JSONB       NOT NULL,   -- UnifiedFood snapshot at time of favouriting
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, food_source, food_id)
);

-- RLS: users can only see and modify their own favourites
ALTER TABLE favorite_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites"
  ON favorite_foods
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast per-user lookup
CREATE INDEX IF NOT EXISTS idx_favorite_foods_user
  ON favorite_foods (user_id, created_at DESC);
