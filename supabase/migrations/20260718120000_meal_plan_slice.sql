-- Milestone 5: meal planner polish on planned_meals.
-- - sort_order for deterministic within-slot ordering
-- - non-empty custom_title (display / recipe title snapshot)
-- - positive-or-null servings
-- - recipe household-consistency trigger

-- Backfill any null titles before tightening the constraint (table is empty in
-- local seed; hosted may have zero rows as well).
UPDATE public.planned_meals
SET custom_title = 'Untitled meal'
WHERE custom_title IS NULL OR btrim(custom_title) = '';

ALTER TABLE public.planned_meals
  ALTER COLUMN custom_title SET DEFAULT '',
  ALTER COLUMN custom_title SET NOT NULL;

-- Drop the original identity CHECK (recipe_id OR custom_title). Postgres names
-- an unnamed table CHECK planned_meals_check when it is the first table CHECK.
ALTER TABLE public.planned_meals
  DROP CONSTRAINT IF EXISTS planned_meals_check;

ALTER TABLE public.planned_meals
  ADD CONSTRAINT planned_meals_title_required
  CHECK (length(btrim(custom_title)) > 0);

ALTER TABLE public.planned_meals
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.planned_meals
  DROP CONSTRAINT IF EXISTS planned_meals_servings_check;

ALTER TABLE public.planned_meals
  ADD CONSTRAINT planned_meals_servings_check
  CHECK (servings IS NULL OR servings > 0);

CREATE OR REPLACE FUNCTION public.enforce_planned_meal_recipe_household()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  recipe_household_id uuid;
BEGIN
  IF NEW.recipe_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT r.household_id
    INTO recipe_household_id
  FROM public.recipes AS r
  WHERE r.id = NEW.recipe_id;

  IF recipe_household_id IS NULL THEN
    RAISE EXCEPTION 'planned_meals.recipe_id does not exist'
      USING ERRCODE = '23503';
  END IF;

  IF recipe_household_id IS DISTINCT FROM NEW.household_id THEN
    RAISE EXCEPTION
      'planned_meals.household_id (%) must match recipe household (%)',
      NEW.household_id,
      recipe_household_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planned_meals_enforce_recipe_household
  ON public.planned_meals;

CREATE TRIGGER planned_meals_enforce_recipe_household
  BEFORE INSERT OR UPDATE OF household_id, recipe_id
  ON public.planned_meals
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_planned_meal_recipe_household();
