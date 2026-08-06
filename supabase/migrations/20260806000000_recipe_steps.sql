-- V1.1 ordered recipe instructions and a single atomic recipe save boundary.

CREATE TABLE public.recipe_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  instruction text NOT NULL CHECK (
    char_length(btrim(instruction)) BETWEEN 1 AND 2000
  ),
  sort_order integer NOT NULL CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, sort_order)
);

CREATE INDEX recipe_steps_household_id_idx
  ON public.recipe_steps (household_id);

CREATE INDEX recipe_steps_recipe_id_idx
  ON public.recipe_steps (recipe_id);

CREATE OR REPLACE FUNCTION public.enforce_recipe_step_household()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  parent_household_id uuid;
BEGIN
  SELECT household_id
  INTO parent_household_id
  FROM public.recipes
  WHERE id = NEW.recipe_id;

  IF parent_household_id IS NULL THEN
    RAISE EXCEPTION 'recipe_steps.recipe_id does not exist'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.household_id <> parent_household_id THEN
    RAISE EXCEPTION
      'recipe_steps.household_id (%) must match recipe household (%)',
      NEW.household_id,
      parent_household_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER recipe_steps_enforce_household
  BEFORE INSERT OR UPDATE OF household_id, recipe_id
  ON public.recipe_steps
  FOR EACH ROW EXECUTE FUNCTION public.enforce_recipe_step_household();

ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recipe_steps
  TO anon, authenticated;

CREATE POLICY recipe_steps_all_member
  ON public.recipe_steps
  FOR ALL
  TO authenticated
  USING (private.is_household_member(household_id))
  WITH CHECK (private.is_household_member(household_id));

-- Preserve any historical free-text method as one first step. Production is
-- expected to have no non-empty values, but this keeps the migration lossless.
INSERT INTO public.recipe_steps (household_id, recipe_id, instruction, sort_order)
SELECT household_id, id, btrim(instructions), 0
FROM public.recipes
WHERE btrim(instructions) <> '';

DROP FUNCTION IF EXISTS public.save_recipe_with_ingredients(
  uuid, text, numeric, integer, integer, text, text, jsonb, uuid, timestamptz
);

ALTER TABLE public.recipes DROP COLUMN instructions;

CREATE FUNCTION public.save_recipe_with_ingredients(
  p_household_id uuid,
  p_name text,
  p_servings numeric,
  p_prep_time_minutes integer,
  p_cook_time_minutes integer,
  p_notes text,
  p_ingredients jsonb,
  p_steps jsonb,
  p_image_path text,
  p_recipe_id uuid DEFAULT NULL,
  p_expected_updated_at timestamptz DEFAULT NULL
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
  v_step_id uuid;
  v_instruction text;
BEGIN
  IF p_image_path IS NOT NULL
     AND split_part(p_image_path, '/', 1) <> p_household_id::text THEN
    RAISE EXCEPTION 'recipe image path must belong to the household'
      USING ERRCODE = '23514';
  END IF;

  IF p_recipe_id IS NULL THEN
    INSERT INTO public.recipes (
      household_id,
      name,
      servings,
      prep_time_minutes,
      cook_time_minutes,
      notes,
      image_path
    )
    VALUES (
      p_household_id,
      p_name,
      p_servings,
      p_prep_time_minutes,
      p_cook_time_minutes,
      COALESCE(p_notes, ''),
      p_image_path
    )
    RETURNING id INTO v_recipe_id;
  ELSE
    IF p_expected_updated_at IS NULL THEN
      RAISE EXCEPTION 'recipe conflict' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.recipes
    SET name = p_name,
        servings = p_servings,
        prep_time_minutes = p_prep_time_minutes,
        cook_time_minutes = p_cook_time_minutes,
        notes = COALESCE(p_notes, ''),
        image_path = p_image_path
    WHERE id = p_recipe_id
      AND household_id = p_household_id
      AND date_trunc('milliseconds', updated_at)
        = date_trunc('milliseconds', p_expected_updated_at)
    RETURNING id INTO v_recipe_id;

    IF v_recipe_id IS NULL THEN
      IF EXISTS (
        SELECT 1
        FROM public.recipes
        WHERE id = p_recipe_id
          AND household_id = p_household_id
      ) THEN
        RAISE EXCEPTION 'recipe conflict' USING ERRCODE = 'P0001';
      ELSE
        RAISE EXCEPTION 'recipe not found' USING ERRCODE = 'P0002';
      END IF;
    END IF;

    DELETE FROM public.recipe_ingredients WHERE recipe_id = v_recipe_id;
    DELETE FROM public.recipe_steps WHERE recipe_id = v_recipe_id;
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
      household_id, recipe_id, ingredient_id, quantity, unit, notes, sort_order
    ) VALUES (
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

  v_index := 0;
  FOR v_line IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_steps, '[]'::jsonb))
  LOOP
    v_instruction := btrim(COALESCE(v_line->>'instruction', ''));
    IF v_instruction = '' THEN
      CONTINUE;
    END IF;

    BEGIN
      v_step_id := (v_line->>'id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'recipe step id must be a UUID' USING ERRCODE = '22023';
    END;

    INSERT INTO public.recipe_steps (
      id, household_id, recipe_id, instruction, sort_order
    ) VALUES (
      COALESCE(v_step_id, gen_random_uuid()),
      p_household_id,
      v_recipe_id,
      v_instruction,
      v_index
    );

    v_index := v_index + 1;
  END LOOP;

  RETURN v_recipe_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_recipe_with_ingredients(
  uuid, text, numeric, integer, integer, text, jsonb, jsonb, text, uuid, timestamptz
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_recipe_with_ingredients(
  uuid, text, numeric, integer, integer, text, jsonb, jsonb, text, uuid, timestamptz
) TO authenticated;
