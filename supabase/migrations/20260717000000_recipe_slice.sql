-- Milestone 7: Recipe management vertical slice.
-- Adds recipe timing, normalized ingredient identity for reuse, nullable
-- ingredient quantities ("to taste"), a household-consistency trigger, and an
-- atomic save RPC. Schema/functions/RLS only. RLS policies for recipes,
-- ingredients, and recipe_ingredients already exist (see earlier migrations).

-- ---------------------------------------------------------------------------
-- recipes: preparation and cooking time (minutes)
-- ---------------------------------------------------------------------------
ALTER TABLE public.recipes
  ADD COLUMN prep_time_minutes integer NULL
    CHECK (prep_time_minutes IS NULL OR prep_time_minutes >= 0),
  ADD COLUMN cook_time_minutes integer NULL
    CHECK (cook_time_minutes IS NULL OR cook_time_minutes >= 0);

-- ---------------------------------------------------------------------------
-- ingredients: normalized identity so the same ingredient is reused across
-- recipes instead of duplicated across casing/whitespace differences.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ingredients
  ADD COLUMN name_normalized text
    GENERATED ALWAYS AS (
      regexp_replace(btrim(lower(name)), '\s+', ' ', 'g')
    ) STORED;

ALTER TABLE public.ingredients
  DROP CONSTRAINT IF EXISTS ingredients_household_id_name_key;

ALTER TABLE public.ingredients
  ADD CONSTRAINT ingredients_household_id_name_normalized_key
  UNIQUE (household_id, name_normalized);

-- ---------------------------------------------------------------------------
-- recipe_ingredients: allow NULL quantity ("to taste"); otherwise positive.
-- ---------------------------------------------------------------------------
ALTER TABLE public.recipe_ingredients
  ALTER COLUMN quantity DROP NOT NULL;

ALTER TABLE public.recipe_ingredients
  DROP CONSTRAINT IF EXISTS recipe_ingredients_quantity_check;

ALTER TABLE public.recipe_ingredients
  ADD CONSTRAINT recipe_ingredients_quantity_check
  CHECK (quantity IS NULL OR quantity > 0);

-- ---------------------------------------------------------------------------
-- Household consistency: a recipe_ingredients row must belong to the same
-- household as both its recipe and its ingredient.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_recipe_ingredient_household()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  recipe_household_id uuid;
  ingredient_household_id uuid;
BEGIN
  SELECT r.household_id
  INTO recipe_household_id
  FROM public.recipes AS r
  WHERE r.id = NEW.recipe_id;

  IF recipe_household_id IS NULL THEN
    RAISE EXCEPTION 'recipe_ingredients.recipe_id does not exist'
      USING ERRCODE = '23503';
  END IF;

  IF recipe_household_id IS DISTINCT FROM NEW.household_id THEN
    RAISE EXCEPTION
      'recipe_ingredients.household_id (%) must match recipe household (%)',
      NEW.household_id,
      recipe_household_id
      USING ERRCODE = '23514';
  END IF;

  SELECT i.household_id
  INTO ingredient_household_id
  FROM public.ingredients AS i
  WHERE i.id = NEW.ingredient_id;

  IF ingredient_household_id IS NULL THEN
    RAISE EXCEPTION 'recipe_ingredients.ingredient_id does not exist'
      USING ERRCODE = '23503';
  END IF;

  IF ingredient_household_id IS DISTINCT FROM NEW.household_id THEN
    RAISE EXCEPTION
      'recipe_ingredients.household_id (%) must match ingredient household (%)',
      NEW.household_id,
      ingredient_household_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER recipe_ingredients_enforce_household
  BEFORE INSERT OR UPDATE OF household_id, recipe_id, ingredient_id
  ON public.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_recipe_ingredient_household();

-- ---------------------------------------------------------------------------
-- Atomic recipe save: upsert the recipe, reuse/create ingredients, and rewrite
-- ordered ingredient lines in one transaction. SECURITY INVOKER so the caller's
-- Row Level Security is enforced on every write.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_recipe_with_ingredients(
  p_household_id uuid,
  p_name text,
  p_servings numeric,
  p_prep_time_minutes integer,
  p_cook_time_minutes integer,
  p_instructions text,
  p_notes text,
  p_ingredients jsonb,
  p_recipe_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_recipe_id uuid;
  v_line jsonb;
  v_name text;
  v_name_normalized text;
  v_unit text;
  v_quantity_text text;
  v_ingredient_id uuid;
  v_index integer := 0;
BEGIN
  IF p_recipe_id IS NULL THEN
    INSERT INTO public.recipes (
      household_id,
      name,
      servings,
      prep_time_minutes,
      cook_time_minutes,
      instructions,
      notes
    )
    VALUES (
      p_household_id,
      p_name,
      p_servings,
      p_prep_time_minutes,
      p_cook_time_minutes,
      COALESCE(p_instructions, ''),
      COALESCE(p_notes, '')
    )
    RETURNING id INTO v_recipe_id;
  ELSE
    UPDATE public.recipes
    SET name = p_name,
        servings = p_servings,
        prep_time_minutes = p_prep_time_minutes,
        cook_time_minutes = p_cook_time_minutes,
        instructions = COALESCE(p_instructions, ''),
        notes = COALESCE(p_notes, '')
    WHERE id = p_recipe_id
      AND household_id = p_household_id
    RETURNING id INTO v_recipe_id;

    IF v_recipe_id IS NULL THEN
      RAISE EXCEPTION 'recipe not found' USING ERRCODE = 'P0002';
    END IF;

    DELETE FROM public.recipe_ingredients
    WHERE recipe_id = v_recipe_id;
  END IF;

  FOR v_line IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_ingredients, '[]'::jsonb))
  LOOP
    v_name := btrim(COALESCE(v_line->>'name', ''));
    v_name_normalized := regexp_replace(lower(v_name), '\s+', ' ', 'g');

    IF v_name_normalized = '' THEN
      CONTINUE;
    END IF;

    v_unit := btrim(lower(COALESCE(v_line->>'unit', '')));
    v_quantity_text := btrim(COALESCE(v_line->>'quantity', ''));

    INSERT INTO public.ingredients (household_id, name, default_unit)
    VALUES (p_household_id, v_name, v_unit)
    ON CONFLICT (household_id, name_normalized) DO NOTHING
    RETURNING id INTO v_ingredient_id;

    IF v_ingredient_id IS NULL THEN
      SELECT id
      INTO v_ingredient_id
      FROM public.ingredients
      WHERE household_id = p_household_id
        AND name_normalized = v_name_normalized;
    END IF;

    INSERT INTO public.recipe_ingredients (
      household_id,
      recipe_id,
      ingredient_id,
      quantity,
      unit,
      notes,
      sort_order
    )
    VALUES (
      p_household_id,
      v_recipe_id,
      v_ingredient_id,
      CASE WHEN v_quantity_text = '' THEN NULL ELSE v_quantity_text::numeric END,
      v_unit,
      btrim(COALESCE(v_line->>'notes', '')),
      v_index
    );

    v_index := v_index + 1;
  END LOOP;

  RETURN v_recipe_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_recipe_with_ingredients(
  uuid, text, numeric, integer, integer, text, text, jsonb, uuid
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_recipe_with_ingredients(
  uuid, text, numeric, integer, integer, text, text, jsonb, uuid
) TO authenticated;
