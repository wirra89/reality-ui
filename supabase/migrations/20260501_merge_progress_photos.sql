-- Copy all rows from progress_photos into progress_entries.
-- Storage paths already use the same progress-photos bucket — no file moves needed.
-- weight, mood, note, phase are null for migrated rows; they can be enriched later via Timeline.

INSERT INTO progress_entries (id, user_id, date, image_url, weight, mood, note, phase, created_at)
SELECT
  id,
  user_id,
  DATE(taken_at) AS date,
  photo_url      AS image_url,
  NULL           AS weight,
  NULL           AS mood,
  NULL           AS note,
  NULL           AS phase,
  created_at
FROM progress_photos
ON CONFLICT (id) DO NOTHING;

DROP TABLE IF EXISTS progress_photos;
