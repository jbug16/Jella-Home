-- Optimistic concurrency for recipe updates via save_recipe_with_ingredients.

DROP FUNCTION IF EXISTS public.save_recipe_with_ingredients(
  uuid, text, numeric, integer, integer, text, text, jsonb, uuid
);

CREATE FUNCTION public.save_recipe_with_ingredients(
  p_household_id uuid,
  p_name text,
  p_servings numeric,
  p_prep_time_minutes integer,
  p_cook_time_minutes integer,
  p_instructions text,
  p_notes text,
  p_ingredients jsonb,
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
    IF p_expected_updated_at IS NULL THEN
      RAISE EXCEPTION 'recipe conflict' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.recipes
    SET name = p_name,
        servings = p_servings,
        prep_time_minutes = p_prep_time_minutes,
        cook_time_minutes = p_cook_time_minutes,
        instructions = COALESCE(p_instructions, ''),
        notes = COALESCE(p_notes, '')
    WHERE id = p_recipe_id
      AND household_id = p_household_id
      -- Millisecond match so ISO form tokens (…Z) survive microsecond DB precision.
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
  uuid, text, numeric, integer, integer, text, text, jsonb, uuid, timestamptz
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_recipe_with_ingredients(
  uuid, text, numeric, integer, integer, text, text, jsonb, uuid, timestamptz
) TO authenticated;
