-- Add description field to recipes.
-- Short 1–2 sentence summary of the dish shown inside the recipe accordion.
-- Empty string default means existing rows are unaffected.
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
