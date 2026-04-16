-- supabase/migrations/013_exercise_logs.sql
-- Adds workout_type to workouts and creates exercise_logs for volume tracking

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS workout_type TEXT;

CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id       BIGINT      REFERENCES public.workouts(id) ON DELETE SET NULL,
  exercise_name    TEXT        NOT NULL,
  exercise_id      TEXT        NOT NULL,
  workout_type     TEXT        NOT NULL,
  phase            TEXT        NOT NULL CHECK (phase IN ('menstrual','follicular','ovulation','luteal')),
  cycle_day        INTEGER     NOT NULL,
  performed_at     DATE        NOT NULL DEFAULT CURRENT_DATE,
  sets_data        JSONB       NOT NULL DEFAULT '[]',
  total_volume_kg  NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_phase
  ON public.exercise_logs (user_id, phase);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_exercise
  ON public.exercise_logs (user_id, exercise_name, performed_at DESC);

ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercise_logs: own rows only"
  ON public.exercise_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
