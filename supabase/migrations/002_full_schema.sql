-- supabase/migrations/002_full_schema.sql
-- Run this in Supabase SQL Editor after 001_create_cycle_logs.sql

-- ── PROFILES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name            TEXT NOT NULL DEFAULT 'Ana',
  cycle_day       INTEGER NOT NULL DEFAULT 1 CHECK (cycle_day >= 1 AND cycle_day <= 28),
  cycle_length    INTEGER NOT NULL DEFAULT 28 CHECK (cycle_length >= 21 AND cycle_length <= 35),
  period_length   INTEGER NOT NULL DEFAULT 5  CHECK (period_length >= 2 AND period_length <= 8),
  goals           TEXT[] DEFAULT '{}',
  units           TEXT NOT NULL DEFAULT 'kg' CHECK (units IN ('kg', 'lbs')),
  notifications   BOOLEAN NOT NULL DEFAULT true,
  avatar_index    INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Ana'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── WORKOUTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workouts (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name        TEXT NOT NULL DEFAULT '',
  cycle_day   INTEGER NOT NULL,
  phase       TEXT NOT NULL,
  exercises   JSONB NOT NULL DEFAULT '[]'
  -- exercises shape: [{name, sets: [{reps, weight}]}]
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own workouts" ON workouts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts (user_id, created_at DESC);

-- ── MEAL LOGS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  cycle_day   INTEGER NOT NULL,
  phase       TEXT NOT NULL,
  meals       JSONB NOT NULL DEFAULT '[]'
  -- meals shape: [{name, calories, protein, time, mealType}]
);

ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own meals" ON meal_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs (user_id, date DESC);

-- ── MOOD LOGS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mood_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  cycle_day   INTEGER NOT NULL,
  phase       TEXT NOT NULL,
  mood        INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 5),
  energy      INTEGER NOT NULL CHECK (energy >= 1 AND energy <= 5),
  symptoms    TEXT[] DEFAULT '{}',
  note        TEXT DEFAULT ''
);

ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own mood logs" ON mood_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mood_logs_user_date ON mood_logs (user_id, date DESC);
