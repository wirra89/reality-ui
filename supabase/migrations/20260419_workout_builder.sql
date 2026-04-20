-- Add template_id and status to workouts table
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS template_id bigint REFERENCES workout_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'abandoned'));

-- Add phase_tags and updated_at to workout_templates table
ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS phase_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill updated_at from created_at for existing rows
UPDATE workout_templates SET updated_at = created_at WHERE updated_at IS NULL;
