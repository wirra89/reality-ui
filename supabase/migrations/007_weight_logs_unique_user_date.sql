-- Blocker 3: add UNIQUE constraint so saveWeightLog can use safe upsert
-- instead of delete-then-insert (which loses data if insert fails).
-- Handle any pre-existing duplicates by keeping the most recent row.
DELETE FROM weight_logs w1
USING weight_logs w2
WHERE w1.user_id = w2.user_id
  AND w1.date = w2.date
  AND w1.id < w2.id;

ALTER TABLE weight_logs
  ADD CONSTRAINT weight_logs_user_id_date_key UNIQUE (user_id, date);
