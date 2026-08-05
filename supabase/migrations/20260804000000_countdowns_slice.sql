-- Dashboard fun countdowns: lightweight upcoming events to count down to.

CREATE TABLE public.countdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  title text NOT NULL,
  target_on date NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT countdowns_title_len
    CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  CONSTRAINT countdowns_notes_len
    CHECK (char_length(notes) <= 500)
);

CREATE INDEX countdowns_household_target_idx
  ON public.countdowns (household_id, target_on);

CREATE TRIGGER countdowns_set_updated_at
  BEFORE UPDATE ON public.countdowns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.countdowns
  TO anon, authenticated;

ALTER TABLE public.countdowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY countdowns_all_member
  ON public.countdowns
  FOR ALL
  TO authenticated
  USING (private.is_household_member(household_id))
  WITH CHECK (private.is_household_member(household_id));
