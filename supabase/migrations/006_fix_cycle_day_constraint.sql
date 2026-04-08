-- Blocker 1: cycle_day CHECK constraint was capped at 28 but cycle_length allows up to 35.
-- Users with cycles > 28 days would silently fail profile updates at the DB level.
ALTER TABLE profiles
  DROP CONSTRAINT profiles_cycle_day_check,
  ADD CONSTRAINT profiles_cycle_day_check CHECK (cycle_day >= 1 AND cycle_day <= 35);
