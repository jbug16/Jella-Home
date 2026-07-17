-- Budget schema prep before Milestone 4 UI:
-- 1) month-scoped planned limits
-- 2) category uniqueness by (household_id, kind, name)
-- 3) subscription category_label (no FK to budget_categories)

-- ---------------------------------------------------------------------------
-- budget_categories: allow the same display name under different kinds
-- ---------------------------------------------------------------------------
ALTER TABLE public.budget_categories
  DROP CONSTRAINT IF EXISTS budget_categories_household_id_name_key;

ALTER TABLE public.budget_categories
  ADD CONSTRAINT budget_categories_household_id_kind_name_key
  UNIQUE (household_id, kind, name);

-- ---------------------------------------------------------------------------
-- subscriptions: classify with free-text label; drop budget category FK
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.subscriptions_category_id_idx;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_category_id_fkey;

ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS category_id;

ALTER TABLE public.subscriptions
  ADD COLUMN category_label text NOT NULL DEFAULT '';

-- ---------------------------------------------------------------------------
-- budget_month_limits
-- ---------------------------------------------------------------------------
CREATE TABLE public.budget_month_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.budget_categories (id) ON DELETE CASCADE,
  month_start date NOT NULL,
  limit_cents integer NOT NULL CHECK (limit_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budget_month_limits_category_id_month_start_key
    UNIQUE (category_id, month_start),
  CONSTRAINT budget_month_limits_month_start_is_first_of_month
    CHECK (month_start = date_trunc('month', month_start)::date)
);

-- Current-month and household-scoped list queries
CREATE INDEX budget_month_limits_household_month_start_idx
  ON public.budget_month_limits (household_id, month_start);

CREATE INDEX budget_month_limits_household_category_id_idx
  ON public.budget_month_limits (household_id, category_id);

CREATE TRIGGER budget_month_limits_set_updated_at
  BEFORE UPDATE ON public.budget_month_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Household consistency: category must belong to the same household as the row.
CREATE OR REPLACE FUNCTION public.enforce_budget_month_limit_household()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  category_household_id uuid;
BEGIN
  SELECT bc.household_id
  INTO category_household_id
  FROM public.budget_categories AS bc
  WHERE bc.id = NEW.category_id;

  IF category_household_id IS NULL THEN
    RAISE EXCEPTION 'budget_month_limits.category_id does not exist'
      USING ERRCODE = '23503';
  END IF;

  IF category_household_id IS DISTINCT FROM NEW.household_id THEN
    RAISE EXCEPTION
      'budget_month_limits.household_id (%) must match category household (%)',
      NEW.household_id,
      category_household_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER budget_month_limits_enforce_household
  BEFORE INSERT OR UPDATE OF household_id, category_id
  ON public.budget_month_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_budget_month_limit_household();

-- Privileges + RLS (match other product tables)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.budget_month_limits
  TO anon, authenticated;

ALTER TABLE public.budget_month_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_month_limits_all_member
  ON public.budget_month_limits
  FOR ALL
  TO authenticated
  USING (private.is_household_member(household_id))
  WITH CHECK (private.is_household_member(household_id));
