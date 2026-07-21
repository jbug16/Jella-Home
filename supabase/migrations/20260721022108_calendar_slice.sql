-- Milestone 10: Household Calendar
-- Native calendar_events (series rows, hard delete, no created_by)
-- Per-user calendar_source_preferences (incl. reserved payment_reminders)

-- ---------------------------------------------------------------------------
-- calendar_events
-- ---------------------------------------------------------------------------
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other'
    CHECK (
      category IN (
        'appointment',
        'date',
        'birthday',
        'holiday',
        'household',
        'reminder',
        'trip',
        'other'
      )
    ),
  all_day boolean NOT NULL DEFAULT true,
  start_on date NOT NULL,
  end_on date NOT NULL,
  start_at time NULL,
  end_at time NULL,
  recurrence text NOT NULL DEFAULT 'none'
    CHECK (
      recurrence IN (
        'none',
        'daily',
        'weekly',
        'every_two_weeks',
        'monthly',
        'yearly'
      )
    ),
  recurrence_end_on date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_title_len
    CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  CONSTRAINT calendar_events_notes_len
    CHECK (char_length(notes) <= 2000),
  CONSTRAINT calendar_events_location_len
    CHECK (char_length(location) <= 200),
  CONSTRAINT calendar_events_end_on_gte_start
    CHECK (end_on >= start_on),
  CONSTRAINT calendar_events_all_day_times
    CHECK (
      (all_day = true AND start_at IS NULL AND end_at IS NULL)
      OR
      (all_day = false AND start_at IS NOT NULL AND end_at IS NOT NULL)
    ),
  -- Same-day timed: end_at > start_at.
  -- Multi-day / overnight timed (end_on > start_on): end_at unconstrained vs start_at.
  CONSTRAINT calendar_events_timed_order
    CHECK (
      all_day = true
      OR end_on > start_on
      OR end_at > start_at
    ),
  CONSTRAINT calendar_events_recurrence_end
    CHECK (
      recurrence_end_on IS NULL
      OR recurrence_end_on >= start_on
    ),
  CONSTRAINT calendar_events_none_no_end
    CHECK (
      recurrence <> 'none'
      OR recurrence_end_on IS NULL
    )
);

CREATE INDEX calendar_events_household_start_idx
  ON public.calendar_events (household_id, start_on);

CREATE INDEX calendar_events_household_recurrence_idx
  ON public.calendar_events (household_id, recurrence, start_on, recurrence_end_on);

CREATE TRIGGER calendar_events_set_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.calendar_events
  TO anon, authenticated;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_events_all_member
  ON public.calendar_events
  FOR ALL
  TO authenticated
  USING (private.is_household_member(household_id))
  WITH CHECK (private.is_household_member(household_id));

-- ---------------------------------------------------------------------------
-- calendar_source_preferences (per authenticated user)
-- ---------------------------------------------------------------------------
CREATE TABLE public.calendar_source_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  source_key text NOT NULL
    CHECK (
      source_key IN (
        'household_events',
        'subscription_renewals',
        'payment_reminders'
      )
    ),
  visible boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id, source_key)
);

CREATE INDEX calendar_source_prefs_user_idx
  ON public.calendar_source_preferences (user_id, household_id);

CREATE TRIGGER calendar_source_preferences_set_updated_at
  BEFORE UPDATE ON public.calendar_source_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.calendar_source_preferences
  TO anon, authenticated;

ALTER TABLE public.calendar_source_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_source_preferences_own_member
  ON public.calendar_source_preferences
  FOR ALL
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.is_household_member(household_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND private.is_household_member(household_id)
  );
