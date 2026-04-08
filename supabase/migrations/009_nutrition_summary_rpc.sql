-- Blocker 6: persist the get_nutrition_summary_for_date RPC in migrations.
-- The function exists live but was missing from the migration history,
-- meaning fresh deployments would not have it.
-- SECURITY DEFINER is safe here because the function explicitly validates
-- auth.uid() = p_user_id before querying, preventing cross-user access.

CREATE OR REPLACE FUNCTION public.get_nutrition_summary_for_date(p_user_id uuid, p_date date)
 RETURNS TABLE(total_kcal numeric, total_protein numeric, total_carbs numeric, total_fats numeric, entry_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Auth enforcement: caller may only query their own data.
  -- SECURITY DEFINER bypasses RLS, so this check is the sole access control.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied: p_user_id must match authenticated user';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(snapshot_kcal),      0)::numeric AS total_kcal,
    COALESCE(SUM(snapshot_protein_g), 0)::numeric AS total_protein,
    COALESCE(SUM(snapshot_carbs_g),   0)::numeric AS total_carbs,
    COALESCE(SUM(snapshot_fats_g),    0)::numeric AS total_fats,
    COUNT(*)::bigint                               AS entry_count
  FROM public.meal_log_entries
  WHERE user_id    = p_user_id
    AND logged_at >= p_date::timestamptz
    AND logged_at <  (p_date + INTERVAL '1 day')::timestamptz;
END;
$function$;
