-- Blocker 5: cycle_logs had USING(true) RLS policy — any anonymous user could
-- read and write all rows. The table has no user_id column, is never called
-- from application code, and only contains pre-auth MVP test data.
-- Dropping it removes the security hole entirely.
DROP TABLE IF EXISTS cycle_logs;
