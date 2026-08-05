-- Calendar was intentionally removed from Jella Home V1.
-- Refuse to drop the schema if household event data appears unexpectedly.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.calendar_events LIMIT 1) THEN
    RAISE EXCEPTION 'calendar_events contains data; refusing Calendar removal';
  END IF;
END
$$;

REVOKE ALL PRIVILEGES ON TABLE public.calendar_source_preferences
  FROM anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.calendar_events
  FROM anon, authenticated, service_role;

DROP POLICY IF EXISTS calendar_source_preferences_own_member
  ON public.calendar_source_preferences;
DROP POLICY IF EXISTS calendar_events_all_member
  ON public.calendar_events;

DROP TRIGGER IF EXISTS calendar_source_preferences_set_updated_at
  ON public.calendar_source_preferences;
DROP TRIGGER IF EXISTS calendar_events_set_updated_at
  ON public.calendar_events;

DROP INDEX IF EXISTS public.calendar_source_prefs_user_idx;
DROP INDEX IF EXISTS public.calendar_events_household_recurrence_idx;
DROP INDEX IF EXISTS public.calendar_events_household_start_idx;

ALTER TABLE public.calendar_source_preferences
  DROP CONSTRAINT IF EXISTS calendar_source_preferences_household_id_user_id_source_key_key,
  DROP CONSTRAINT IF EXISTS calendar_source_preferences_source_key_check,
  DROP CONSTRAINT IF EXISTS calendar_source_preferences_user_id_fkey,
  DROP CONSTRAINT IF EXISTS calendar_source_preferences_household_id_fkey,
  DROP CONSTRAINT IF EXISTS calendar_source_preferences_pkey;

ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_category_check,
  DROP CONSTRAINT IF EXISTS calendar_events_recurrence_check,
  DROP CONSTRAINT IF EXISTS calendar_events_none_no_end,
  DROP CONSTRAINT IF EXISTS calendar_events_recurrence_end,
  DROP CONSTRAINT IF EXISTS calendar_events_timed_order,
  DROP CONSTRAINT IF EXISTS calendar_events_all_day_times,
  DROP CONSTRAINT IF EXISTS calendar_events_end_on_gte_start,
  DROP CONSTRAINT IF EXISTS calendar_events_location_len,
  DROP CONSTRAINT IF EXISTS calendar_events_notes_len,
  DROP CONSTRAINT IF EXISTS calendar_events_title_len,
  DROP CONSTRAINT IF EXISTS calendar_events_household_id_fkey,
  DROP CONSTRAINT IF EXISTS calendar_events_pkey;

-- Dropping the preference table deletes the two approved disabled rows.
DROP TABLE public.calendar_source_preferences;
DROP TABLE public.calendar_events;

-- public.set_updated_at() is shared by remaining modules and is retained.
