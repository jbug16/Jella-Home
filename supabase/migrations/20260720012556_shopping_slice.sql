-- Milestone 6: Shopping / grocery list vertical slice.
-- Adds generation_key, week uniqueness, household-consistency trigger, and an
-- atomic regenerate RPC that reconciles generated rows by generation_key.
-- Schema/functions/RLS only. Tables and member policies already exist.

-- ---------------------------------------------------------------------------
-- grocery_list_items: deterministic bucket identity for generated rows
-- ---------------------------------------------------------------------------
ALTER TABLE public.grocery_list_items
  ADD COLUMN IF NOT EXISTS generation_key text NULL;

ALTER TABLE public.grocery_list_items
  DROP CONSTRAINT IF EXISTS grocery_list_items_source_generation_key_check;

ALTER TABLE public.grocery_list_items
  ADD CONSTRAINT grocery_list_items_source_generation_key_check
  CHECK (
    (source = 'manual' AND generation_key IS NULL)
    OR (source = 'generated' AND generation_key IS NOT NULL AND length(btrim(generation_key)) > 0)
  );

CREATE UNIQUE INDEX IF NOT EXISTS grocery_list_items_list_generation_key_uidx
  ON public.grocery_list_items (list_id, generation_key)
  WHERE source = 'generated' AND generation_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS grocery_list_items_list_source_checked_idx
  ON public.grocery_list_items (list_id, source, is_checked);

-- ---------------------------------------------------------------------------
-- grocery_lists: one active list per household Sunday week
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS grocery_lists_household_week_active_uidx
  ON public.grocery_lists (household_id, week_start_on)
  WHERE status = 'active' AND week_start_on IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Household consistency for grocery_list_items
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_grocery_list_item_household()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  list_household_id uuid;
  ingredient_household_id uuid;
  recipe_household_id uuid;
BEGIN
  SELECT gl.household_id
    INTO list_household_id
  FROM public.grocery_lists AS gl
  WHERE gl.id = NEW.list_id;

  IF list_household_id IS NULL THEN
    RAISE EXCEPTION 'grocery_list_items.list_id does not exist'
      USING ERRCODE = '23503';
  END IF;

  IF list_household_id IS DISTINCT FROM NEW.household_id THEN
    RAISE EXCEPTION
      'grocery_list_items.household_id (%) must match list household (%)',
      NEW.household_id,
      list_household_id
      USING ERRCODE = '23514';
  END IF;

  IF NEW.ingredient_id IS NOT NULL THEN
    SELECT i.household_id
      INTO ingredient_household_id
    FROM public.ingredients AS i
    WHERE i.id = NEW.ingredient_id;

    IF ingredient_household_id IS NULL THEN
      RAISE EXCEPTION 'grocery_list_items.ingredient_id does not exist'
        USING ERRCODE = '23503';
    END IF;

    IF ingredient_household_id IS DISTINCT FROM NEW.household_id THEN
      RAISE EXCEPTION
        'grocery_list_items.household_id (%) must match ingredient household (%)',
        NEW.household_id,
        ingredient_household_id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.recipe_id IS NOT NULL THEN
    SELECT r.household_id
      INTO recipe_household_id
    FROM public.recipes AS r
    WHERE r.id = NEW.recipe_id;

    IF recipe_household_id IS NULL THEN
      RAISE EXCEPTION 'grocery_list_items.recipe_id does not exist'
        USING ERRCODE = '23503';
    END IF;

    IF recipe_household_id IS DISTINCT FROM NEW.household_id THEN
      RAISE EXCEPTION
        'grocery_list_items.household_id (%) must match recipe household (%)',
        NEW.household_id,
        recipe_household_id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grocery_list_items_enforce_household
  ON public.grocery_list_items;

CREATE TRIGGER grocery_list_items_enforce_household
  BEFORE INSERT OR UPDATE OF household_id, list_id, ingredient_id, recipe_id
  ON public.grocery_list_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_grocery_list_item_household();

-- ---------------------------------------------------------------------------
-- Atomic regenerate: reconcile generated rows by generation_key.
-- SECURITY INVOKER so the caller's RLS applies. Aggregation stays in the app.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.regenerate_grocery_list(
  p_household_id uuid,
  p_week_start_on date,
  p_items jsonb,
  p_list_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_list_id uuid;
  v_item jsonb;
  v_key text;
  v_name text;
  v_unit text;
  v_notes text;
  v_section text;
  v_ingredient_id uuid;
  v_quantity numeric;
  v_sort_order integer;
  v_keys text[] := ARRAY[]::text[];
  v_updated integer;
  v_ingredient_household uuid;
BEGIN
  -- Membership via RLS (authenticated has no USAGE on private schema, so do
  -- not call private.is_household_member from this INVOKER function).
  IF NOT EXISTS (
    SELECT 1
    FROM public.households AS h
    WHERE h.id = p_household_id
  ) THEN
    RAISE EXCEPTION 'not a household member' USING ERRCODE = '42501';
  END IF;

  -- Canonical week start is Sunday (DOW 0). Reject non-Sunday params.
  IF EXTRACT(DOW FROM p_week_start_on) <> 0 THEN
    RAISE EXCEPTION 'week_start_on must be a Sunday'
      USING ERRCODE = '23514';
  END IF;

  -- Serialize concurrent regenerates for this household+week.
  PERFORM pg_advisory_xact_lock(
    hashtext('grocery_regen:' || p_household_id::text || ':' || p_week_start_on::text)
  );

  SELECT gl.id
    INTO v_list_id
  FROM public.grocery_lists AS gl
  WHERE gl.household_id = p_household_id
    AND gl.week_start_on = p_week_start_on
    AND gl.status = 'active'
  FOR UPDATE;

  IF v_list_id IS NULL THEN
    BEGIN
      INSERT INTO public.grocery_lists (
        household_id,
        name,
        week_start_on,
        status
      )
      VALUES (
        p_household_id,
        COALESCE(NULLIF(btrim(p_list_name), ''), 'Shopping list'),
        p_week_start_on,
        'active'
      )
      RETURNING id INTO v_list_id;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT gl.id
          INTO v_list_id
        FROM public.grocery_lists AS gl
        WHERE gl.household_id = p_household_id
          AND gl.week_start_on = p_week_start_on
          AND gl.status = 'active'
        FOR UPDATE;
    END;
  END IF;

  IF v_list_id IS NULL THEN
    RAISE EXCEPTION 'unable to create grocery list' USING ERRCODE = 'P0002';
  END IF;

  -- Re-lock in case we took the unique_violation path without FOR UPDATE held.
  SELECT gl.id
    INTO v_list_id
  FROM public.grocery_lists AS gl
  WHERE gl.id = v_list_id
  FOR UPDATE;

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    v_key := btrim(COALESCE(v_item->>'generation_key', ''));
    IF v_key = '' THEN
      RAISE EXCEPTION 'generation_key is required for generated items'
        USING ERRCODE = '23514';
    END IF;

    v_name := btrim(COALESCE(v_item->>'name', ''));
    IF v_name = '' THEN
      RAISE EXCEPTION 'name is required for generated items'
        USING ERRCODE = '23514';
    END IF;

    v_unit := btrim(COALESCE(v_item->>'unit', ''));
    v_notes := btrim(COALESCE(v_item->>'notes', ''));
    v_section := btrim(COALESCE(v_item->>'store_section', ''));
    v_sort_order := COALESCE((v_item->>'sort_order')::integer, 0);

    IF v_item ? 'quantity' AND NULLIF(btrim(COALESCE(v_item->>'quantity', '')), '') IS NOT NULL THEN
      v_quantity := (v_item->>'quantity')::numeric;
    ELSE
      v_quantity := NULL;
    END IF;

    IF v_item ? 'ingredient_id'
       AND NULLIF(btrim(COALESCE(v_item->>'ingredient_id', '')), '') IS NOT NULL THEN
      v_ingredient_id := (v_item->>'ingredient_id')::uuid;
      SELECT i.household_id
        INTO v_ingredient_household
      FROM public.ingredients AS i
      WHERE i.id = v_ingredient_id;

      IF v_ingredient_household IS NULL THEN
        RAISE EXCEPTION 'ingredient does not exist' USING ERRCODE = '23503';
      END IF;

      IF v_ingredient_household IS DISTINCT FROM p_household_id THEN
        RAISE EXCEPTION 'ingredient belongs to another household'
          USING ERRCODE = '23514';
      END IF;
    ELSE
      v_ingredient_id := NULL;
    END IF;

    v_keys := array_append(v_keys, v_key);

    UPDATE public.grocery_list_items
    SET name = v_name,
        quantity = v_quantity,
        unit = v_unit,
        notes = v_notes,
        store_section = v_section,
        ingredient_id = v_ingredient_id,
        recipe_id = NULL,
        sort_order = v_sort_order
        -- is_checked intentionally preserved
    WHERE list_id = v_list_id
      AND household_id = p_household_id
      AND source = 'generated'
      AND generation_key = v_key;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated = 0 THEN
      INSERT INTO public.grocery_list_items (
        household_id,
        list_id,
        name,
        quantity,
        unit,
        store_section,
        is_checked,
        source,
        ingredient_id,
        recipe_id,
        notes,
        generation_key,
        sort_order
      )
      VALUES (
        p_household_id,
        v_list_id,
        v_name,
        v_quantity,
        v_unit,
        v_section,
        false,
        'generated',
        v_ingredient_id,
        NULL,
        v_notes,
        v_key,
        v_sort_order
      );
    END IF;
  END LOOP;

  -- Remove unchecked generated rows that are no longer required.
  -- Checked orphans remain as completed historical items.
  DELETE FROM public.grocery_list_items
  WHERE list_id = v_list_id
    AND household_id = p_household_id
    AND source = 'generated'
    AND is_checked = false
    AND (
      cardinality(v_keys) = 0
      OR NOT (generation_key = ANY (v_keys))
    );

  -- Never touch manual rows (no UPDATE/DELETE above uses source = 'manual').

  RETURN v_list_id;
END;
$$;

REVOKE ALL ON FUNCTION public.regenerate_grocery_list(uuid, date, jsonb, text)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.regenerate_grocery_list(uuid, date, jsonb, text)
  TO authenticated;
