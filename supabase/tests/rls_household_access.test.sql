-- pgTAP: household RLS coverage (Milestone 2 + budget schema prep).
-- Requires seeded fake users from supabase/seed.sql.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(108);

CREATE OR REPLACE FUNCTION public.test_as_user(uid uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', uid::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';
END;
$$;

CREATE OR REPLACE FUNCTION public.test_as_anon()
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('role', 'anon')::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE anon';
END;
$$;

-- 1) RLS enabled on all product tables
SELECT ok(
  (
    SELECT bool_and(c.relrowsecurity)
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN (
        'households',
        'household_members',
        'budget_categories',
        'budget_month_limits',
        'transactions',
        'ingredients',
        'recipes',
        'recipe_ingredients',
        'recipe_steps',
        'planned_meals',
        'grocery_lists',
        'grocery_list_items',
        'subscriptions',
        'countdowns'
      )
  ),
  'RLS is enabled on all product tables'
);

-- 2) Anonymous access denied
SELECT public.test_as_anon();

SELECT is(
  (SELECT count(*)::integer FROM public.households),
  0,
  'anonymous cannot read households'
);

SELECT is(
  (SELECT count(*)::integer FROM public.transactions),
  0,
  'anonymous cannot read transactions'
);

SELECT is(
  (SELECT count(*)::integer FROM public.budget_month_limits),
  0,
  'anonymous cannot read budget month limits'
);

SELECT throws_ok(
  $$INSERT INTO public.budget_categories (household_id, name, kind)
    VALUES ('11111111-1111-4111-8111-111111111111', 'Anon Cat', 'expense')$$,
  '42501',
  NULL,
  'anonymous cannot insert budget categories'
);

-- 3) Authenticated non-member denied
SELECT public.test_as_user('dddddddd-dddd-4ddd-8ddd-dddddddddddd');

SELECT is(
  (SELECT count(*)::integer FROM public.households),
  0,
  'non-member cannot read households'
);

SELECT is(
  (SELECT count(*)::integer FROM public.transactions),
  0,
  'non-member cannot read transactions'
);

SELECT is(
  (SELECT count(*)::integer FROM public.budget_month_limits),
  0,
  'non-member cannot read budget month limits'
);

SELECT throws_ok(
  $$INSERT INTO public.budget_categories (household_id, name, kind)
    VALUES ('11111111-1111-4111-8111-111111111111', 'NonMember Cat', 'expense')$$,
  '42501',
  NULL,
  'non-member cannot insert into a household'
);

-- 4) Member can read and write own household
-- Positive-read assertions are scoped to fixture-owned rows (by fixed UUID or
-- fixture attributes) rather than a global count(*), so they stay deterministic
-- even when the Playwright suite has written rows into this same household on a
-- shared local database.
SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.households
    WHERE id = '11111111-1111-4111-8111-111111111111'
  ),
  1,
  'member can read own household'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.transactions
    WHERE household_id = '11111111-1111-4111-8111-111111111111'
      AND payee = 'Whole Foods'
  ),
  1,
  'member can read own household transactions'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.budget_month_limits
    WHERE household_id = '11111111-1111-4111-8111-111111111111'
      AND category_id = '33333333-3333-4333-8333-333333333333'
      AND month_start = date_trunc('month', CURRENT_DATE)::date
  ),
  1,
  'member can read own household budget month limits'
);

SELECT lives_ok(
  $$INSERT INTO public.budget_categories (household_id, name, kind)
    VALUES ('11111111-1111-4111-8111-111111111111', 'Member Written', 'expense')$$,
  'member can insert into own household'
);

SELECT lives_ok(
  $$UPDATE public.transactions
    SET payee = 'Updated by member'
    WHERE household_id = '11111111-1111-4111-8111-111111111111'$$,
  'member can update own household transactions'
);

SELECT lives_ok(
  $$INSERT INTO public.budget_month_limits (
      household_id, category_id, month_start, limit_cents
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      '33333333-3333-4333-8333-333333333333',
      (date_trunc('month', CURRENT_DATE) + interval '1 month')::date,
      25000
    )$$,
  'member can insert budget month limits for own household'
);

-- Equal permissions: second member of same household can also write
SELECT public.test_as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

SELECT lives_ok(
  $$INSERT INTO public.budget_categories (household_id, name, kind)
    VALUES ('11111111-1111-4111-8111-111111111111', 'Member B Written', 'bill')$$,
  'second household member has equal write access'
);

-- 5) Cross-household denied
SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.households
    WHERE id = '22222222-2222-4222-8222-222222222222'
  ),
  0,
  'member cannot read another household'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.transactions
    WHERE household_id = '22222222-2222-4222-8222-222222222222'
  ),
  0,
  'member cannot read another household transactions'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.budget_month_limits
    WHERE household_id = '22222222-2222-4222-8222-222222222222'
  ),
  0,
  'member cannot read another household budget month limits'
);

SELECT throws_ok(
  $$INSERT INTO public.budget_categories (household_id, name, kind)
    VALUES ('22222222-2222-4222-8222-222222222222', 'Cross Insert', 'expense')$$,
  '42501',
  NULL,
  'member cannot insert into another household'
);

-- Attempt cross-household update (no visible rows under RLS)
UPDATE public.transactions
SET payee = 'Hijacked'
WHERE household_id = '22222222-2222-4222-8222-222222222222';

RESET ROLE;
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.transactions
    WHERE household_id = '22222222-2222-4222-8222-222222222222'
      AND payee = 'Hijacked'
  ),
  0,
  'cross-household update is a no-op under RLS'
);

-- 6) household_id cannot be reassigned to an unauthorized household
SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

SELECT throws_ok(
  $$UPDATE public.transactions
    SET household_id = '22222222-2222-4222-8222-222222222222'
    WHERE household_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  NULL,
  'member cannot reassign household_id to an unauthorized household'
);

-- 7) budget_month_limits household consistency (category from other household)
-- Use service role path via RESET ROLE so the trigger (not only RLS) is asserted.
RESET ROLE;

SELECT throws_ok(
  $$INSERT INTO public.budget_month_limits (
      household_id, category_id, month_start, limit_cents
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      '44444444-4444-4444-8444-444444444444',
      date_trunc('month', CURRENT_DATE)::date,
      1000
    )$$,
  '23514',
  NULL,
  'budget_month_limits rejects category from a different household'
);

-- 8) Same category name under different kinds is allowed
SELECT lives_ok(
  $$INSERT INTO public.budget_categories (household_id, name, kind)
    VALUES (
      '11111111-1111-4111-8111-111111111111',
      'Transfer',
      'debt'
    )$$,
  'same category name may exist under a different kind'
);

SELECT lives_ok(
  $$INSERT INTO public.budget_categories (household_id, name, kind)
    VALUES (
      '11111111-1111-4111-8111-111111111111',
      'Transfer',
      'savings'
    )$$,
  'UNIQUE (household_id, kind, name) permits Transfer under savings and debt'
);

-- ===========================================================================
-- Recipes, ingredients, recipe_ingredients (Milestone 7)
-- ===========================================================================

-- Anonymous cannot read recipe tables
SELECT public.test_as_anon();

SELECT is(
  (SELECT count(*)::integer FROM public.recipes),
  0,
  'anonymous cannot read recipes'
);

SELECT is(
  (SELECT count(*)::integer FROM public.ingredients),
  0,
  'anonymous cannot read ingredients'
);

SELECT is(
  (SELECT count(*)::integer FROM public.recipe_ingredients),
  0,
  'anonymous cannot read recipe ingredients'
);

SELECT is(
  (SELECT count(*)::integer FROM public.recipe_steps),
  0,
  'anonymous cannot read recipe steps'
);

-- Authenticated non-member cannot read recipes
SELECT public.test_as_user('dddddddd-dddd-4ddd-8ddd-dddddddddddd');

SELECT is(
  (SELECT count(*)::integer FROM public.recipes),
  0,
  'non-member cannot read recipes'
);

-- Member reads own household fixtures. Scoped to fixed fixture UUIDs (not a
-- global count(*)) so the Playwright suite's recipe/ingredient writes into this
-- same household on a shared local database cannot make these flaky.
SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.recipes
    WHERE id = '66666666-6666-4666-8666-666666666666'
  ),
  1,
  'member can read own household recipes'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.ingredients
    WHERE id IN (
      '88888888-8888-4888-8888-888888888888',
      '99999999-9999-4999-8999-999999999999'
    )
  ),
  2,
  'member can read own household ingredients'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.recipe_ingredients
    WHERE id IN (
      'b0000000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-000000000002'
    )
  ),
  2,
  'member can read own household recipe ingredients'
);

-- Cross-household reads/writes denied
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.recipes
    WHERE household_id = '22222222-2222-4222-8222-222222222222'
  ),
  0,
  'member cannot read another household recipes'
);

SELECT throws_ok(
  $$INSERT INTO public.recipes (household_id, name)
    VALUES ('22222222-2222-4222-8222-222222222222', 'Cross Recipe')$$,
  '42501',
  NULL,
  'member cannot insert a recipe into another household'
);

SELECT throws_ok(
  $$UPDATE public.recipes
    SET household_id = '22222222-2222-4222-8222-222222222222'
    WHERE household_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  NULL,
  'member cannot reassign a recipe to an unauthorized household'
);

SELECT lives_ok(
  $$INSERT INTO public.recipes (household_id, name)
    VALUES ('11111111-1111-4111-8111-111111111111', 'Member Recipe')$$,
  'member can insert a recipe into own household'
);

-- Household-consistency trigger (assert under RESET ROLE so the trigger, not
-- only RLS, is exercised).
RESET ROLE;

SELECT throws_ok(
  $$INSERT INTO public.recipe_ingredients (
      household_id, recipe_id, ingredient_id, quantity, unit, sort_order
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      '77777777-7777-4777-8777-777777777777',
      '88888888-8888-4888-8888-888888888888',
      1, 'g', 0
    )$$,
  '23514',
  NULL,
  'recipe_ingredients rejects a recipe from a different household'
);

SELECT throws_ok(
  $$INSERT INTO public.recipe_ingredients (
      household_id, recipe_id, ingredient_id, quantity, unit, sort_order
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      '66666666-6666-4666-8666-666666666666',
      'a0000000-0000-4000-8000-000000000001',
      1, 'cup', 0
    )$$,
  '23514',
  NULL,
  'recipe_ingredients rejects an ingredient from a different household'
);

SELECT throws_ok(
  $$INSERT INTO public.recipe_steps (
      household_id, recipe_id, instruction, sort_order
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      '77777777-7777-4777-8777-777777777777',
      'Cross household step', 0
    )$$,
  '23514',
  NULL,
  'recipe_steps rejects a recipe from a different household'
);

-- Atomic save RPC as a member: reuses existing ingredients, creates new ones.
SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

SELECT lives_ok(
  $$SELECT public.save_recipe_with_ingredients(
      '11111111-1111-4111-8111-111111111111'::uuid,
      'RPC Recipe',
      2,
      NULL,
      NULL,
      '',
      '[{"name":"Spaghetti","quantity":"100","unit":"g","notes":""},
        {"name":"Garlic","quantity":"2","unit":"clove","notes":""}]'::jsonb,
      '[{"id":"c1000000-0000-4000-8000-000000000001","instruction":"Prep."},
        {"id":"c1000000-0000-4000-8000-000000000002","instruction":"Cook."}]'::jsonb,
      NULL
    )$$,
  'member can save a recipe via the RPC'
);

SELECT is(
  (SELECT count(*)::integer FROM public.recipe_steps
   WHERE id IN ('c1000000-0000-4000-8000-000000000001',
                'c1000000-0000-4000-8000-000000000002')),
  2,
  'RPC saves ordered recipe steps atomically'
);

SELECT is(
  (SELECT string_agg(instruction, ',' ORDER BY sort_order)
   FROM public.recipe_steps
   WHERE id IN ('c1000000-0000-4000-8000-000000000001',
                'c1000000-0000-4000-8000-000000000002')),
  'Prep.,Cook.',
  'recipe step order is deterministic'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.ingredients
    WHERE household_id = '11111111-1111-4111-8111-111111111111'
      AND name_normalized = 'spaghetti'
  ),
  1,
  'RPC reuses the existing ingredient (no duplicate)'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.ingredients
    WHERE household_id = '11111111-1111-4111-8111-111111111111'
      AND name_normalized = 'garlic'
  ),
  1,
  'RPC creates the new ingredient'
);

-- Normalized-name uniqueness (case/whitespace-insensitive) is enforced.
SELECT throws_ok(
  $$INSERT INTO public.ingredients (household_id, name)
    VALUES ('11111111-1111-4111-8111-111111111111', '  SPAGHETTI  ')$$,
  '23505',
  NULL,
  'duplicate normalized ingredient name is rejected'
);

-- Non-member cannot save through the RPC (RLS denies the write).
SELECT public.test_as_user('dddddddd-dddd-4ddd-8ddd-dddddddddddd');

SELECT throws_ok(
  $$SELECT public.save_recipe_with_ingredients(
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Nope',
      1,
      NULL,
      NULL,
      '',
      '[{"name":"X","quantity":"1","unit":"","notes":""}]'::jsonb,
      '[]'::jsonb,
      NULL
    )$$,
  '42501',
  NULL,
  'non-member cannot save a recipe via the RPC'
);

SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::integer FROM public.recipe_steps
   WHERE household_id = '22222222-2222-4222-8222-222222222222'),
  0,
  'other-household recipe steps remain isolated'
);

-- ---------------------------------------------------------------------------
-- Recipe images: schema, bucket, and household-scoped Storage RLS.
-- ---------------------------------------------------------------------------
RESET ROLE;

SELECT has_column(
  'public', 'recipes', 'image_path',
  'recipes has an image_path column'
);

SELECT is(
  (SELECT count(*)::integer FROM storage.buckets WHERE id = 'recipe-images'),
  1,
  'recipe-images storage bucket exists'
);

-- Member A can upload into their own household folder (exercises the storage
-- RLS policy, which calls private.can_access_recipe_image).
SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

SELECT lives_ok(
  $$INSERT INTO storage.objects (id, bucket_id, name)
    VALUES (
      gen_random_uuid(),
      'recipe-images',
      '11111111-1111-4111-8111-111111111111/fixture.jpg'
    )$$,
  'member can upload an image into their household folder'
);

-- Outsider (household B): cannot see or upload household A images.
SELECT public.test_as_user('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

SELECT is(
  (
    SELECT count(*)::integer
    FROM storage.objects
    WHERE bucket_id = 'recipe-images'
      AND name = '11111111-1111-4111-8111-111111111111/fixture.jpg'
  ),
  0,
  'outsider cannot see another household image object'
);

SELECT throws_ok(
  $$INSERT INTO storage.objects (id, bucket_id, name)
    VALUES (
      gen_random_uuid(),
      'recipe-images',
      '11111111-1111-4111-8111-111111111111/evil.jpg'
    )$$,
  '42501',
  NULL,
  'outsider cannot upload into another household folder'
);

-- Member A can see their own uploaded object.
SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

SELECT is(
  (
    SELECT count(*)::integer
    FROM storage.objects
    WHERE bucket_id = 'recipe-images'
      AND name = '11111111-1111-4111-8111-111111111111/fixture.jpg'
  ),
  1,
  'member can see their own uploaded image object'
);

-- ---------------------------------------------------------------------------
-- Planned meals (Milestone 5): title integrity, RLS, household trigger.
-- ---------------------------------------------------------------------------
RESET ROLE;

SELECT has_column(
  'public', 'planned_meals', 'sort_order',
  'planned_meals has a sort_order column'
);

-- Member A: insert recipe-linked meal with title snapshot.
SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

SELECT lives_ok(
  $$INSERT INTO public.planned_meals (
      id, household_id, plan_date, meal_slot, recipe_id, custom_title, notes, sort_order
    ) VALUES (
      'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1',
      '11111111-1111-4111-8111-111111111111',
      CURRENT_DATE,
      'dinner',
      '66666666-6666-4666-8666-666666666666',
      'Fixture Spaghetti',
      'fixture notes',
      0
    )$$,
  'member can insert a planned meal with recipe + title'
);

SELECT is(
  (
    SELECT custom_title
    FROM public.planned_meals
    WHERE id = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1'
  ),
  'Fixture Spaghetti',
  'member can read their planned meal title snapshot'
);

-- Empty title is rejected (strengthened CHECK).
SELECT throws_ok(
  $$INSERT INTO public.planned_meals (
      household_id, plan_date, meal_slot, custom_title
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      CURRENT_DATE,
      'lunch',
      '   '
    )$$,
  '23514',
  NULL,
  'empty custom_title is rejected'
);

-- Custom-title-only meal is allowed.
SELECT lives_ok(
  $$INSERT INTO public.planned_meals (
      id, household_id, plan_date, meal_slot, custom_title, sort_order
    ) VALUES (
      'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2',
      '11111111-1111-4111-8111-111111111111',
      CURRENT_DATE,
      'snack',
      'Takeout tacos',
      0
    )$$,
  'member can insert a custom-title-only planned meal'
);

-- Cross-household insert denied.
SELECT throws_ok(
  $$INSERT INTO public.planned_meals (
      household_id, plan_date, meal_slot, custom_title
    ) VALUES (
      '22222222-2222-4222-8222-222222222222',
      CURRENT_DATE,
      'dinner',
      'Nope'
    )$$,
  '42501',
  NULL,
  'member cannot insert a planned meal into another household'
);

-- Outsider cannot read household A meals.
SELECT public.test_as_user('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.planned_meals
    WHERE id = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1'
  ),
  0,
  'outsider cannot read another household planned meal'
);

-- Equal write: member B of household A can update the fixture meal.
SELECT public.test_as_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

SELECT lives_ok(
  $$UPDATE public.planned_meals
      SET notes = 'updated by member b'
    WHERE id = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1'$$,
  'household co-member can update a planned meal'
);

-- Trigger: recipe from another household is rejected (bypass RLS with RESET ROLE).
RESET ROLE;

SELECT throws_ok(
  $$INSERT INTO public.planned_meals (
      household_id, plan_date, meal_slot, recipe_id, custom_title
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      CURRENT_DATE,
      'breakfast',
      '77777777-7777-4777-8777-777777777777',
      'Stolen recipe'
    )$$,
  '23514',
  NULL,
  'planned meal recipe must belong to the same household'
);

-- Invalid slot CHECK (clean assertion).
SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

SELECT throws_ok(
  $$INSERT INTO public.planned_meals (
      household_id, plan_date, meal_slot, custom_title
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      CURRENT_DATE,
      'brunch',
      'Brunch'
    )$$,
  '23514',
  NULL,
  'invalid meal_slot value is rejected'
);

-- Member can delete their meal.
SELECT lives_ok(
  $$DELETE FROM public.planned_meals
    WHERE id = 'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2'$$,
  'member can hard-delete a planned meal'
);

-- ---------------------------------------------------------------------------
-- Grocery lists (Milestone 6): generation_key, week unique, regenerate RPC.
-- ---------------------------------------------------------------------------
RESET ROLE;

SELECT has_column(
  'public', 'grocery_list_items', 'generation_key',
  'grocery_list_items has a generation_key column'
);

SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

-- Sunday week 2025-06-01
SELECT lives_ok(
  $$INSERT INTO public.grocery_lists (
      id, household_id, name, week_start_on, status
    ) VALUES (
      'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1',
      '11111111-1111-4111-8111-111111111111',
      'Shopping test',
      '2025-06-01',
      'active'
    )$$,
  'member can insert an active grocery list for a Sunday week'
);

SELECT lives_ok(
  $$INSERT INTO public.grocery_list_items (
      id, household_id, list_id, name, quantity, unit, source, notes, generation_key
    ) VALUES (
      'd1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1',
      '11111111-1111-4111-8111-111111111111',
      'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1',
      'Paper towels',
      1,
      'package',
      'manual',
      'keep me',
      NULL
    )$$,
  'member can insert a manual grocery item'
);

-- Second active list same week is rejected.
SELECT throws_ok(
  $$INSERT INTO public.grocery_lists (
      household_id, name, week_start_on, status
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      'Duplicate week',
      '2025-06-01',
      'active'
    )$$,
  '23505',
  NULL,
  'partial unique prevents two active lists for the same week'
);

-- Cross-household list/ingredient rejected by trigger (RESET ROLE to bypass RLS).
RESET ROLE;

SELECT lives_ok(
  $$INSERT INTO public.grocery_lists (
      id, household_id, name, week_start_on, status
    ) VALUES (
      'c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2',
      '22222222-2222-4222-8222-222222222222',
      'Household B list',
      '2025-06-01',
      'active'
    )$$,
  'setup grocery list for household B'
);

SELECT throws_ok(
  $$INSERT INTO public.grocery_list_items (
      household_id, list_id, name, source, generation_key
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      'c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2',
      'Bad list',
      'manual',
      NULL
    )$$,
  '23514',
  NULL,
  'grocery item list must belong to the same household'
);

SELECT throws_ok(
  $$INSERT INTO public.grocery_list_items (
      household_id, list_id, name, source, ingredient_id, generation_key
    ) VALUES (
      '22222222-2222-4222-8222-222222222222',
      'c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2',
      'Stolen spaghetti',
      'generated',
      '88888888-8888-4888-8888-888888888888',
      '88888888-8888-4888-8888-888888888888|g|'
    )$$,
  '23514',
  NULL,
  'grocery item ingredient must belong to the same household'
);

SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

-- Regenerate with two generated buckets.
SELECT is(
  public.regenerate_grocery_list(
    '11111111-1111-4111-8111-111111111111',
    '2025-06-01',
    '[
      {
        "generation_key": "88888888-8888-4888-8888-888888888888|g|",
        "name": "Spaghetti",
        "quantity": "200",
        "unit": "g",
        "notes": "",
        "store_section": "Pasta",
        "ingredient_id": "88888888-8888-4888-8888-888888888888",
        "sort_order": 0
      },
      {
        "generation_key": "99999999-9999-4999-8999-999999999999|tbsp|to coat",
        "name": "Olive Oil",
        "quantity": "2",
        "unit": "tbsp",
        "notes": "to coat",
        "store_section": "",
        "ingredient_id": "99999999-9999-4999-8999-999999999999",
        "sort_order": 1
      }
    ]'::jsonb,
    'Shopping test'
  ),
  'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1'::uuid,
  'regenerate returns the existing list id'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.grocery_list_items
    WHERE list_id = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1'
      AND source = 'generated'
  ),
  2,
  'regenerate inserts generated buckets'
);

SELECT is(
  (
    SELECT notes
    FROM public.grocery_list_items
    WHERE id = 'd1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1'
  ),
  'keep me',
  'manual item notes unchanged after regenerate'
);

-- Check Spaghetti, then refresh with new quantity.
SELECT lives_ok(
  $$UPDATE public.grocery_list_items
      SET is_checked = true
    WHERE list_id = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1'
      AND generation_key = '88888888-8888-4888-8888-888888888888|g|'$$,
  'member can check a generated item'
);

SELECT lives_ok(
  $$SELECT public.regenerate_grocery_list(
      '11111111-1111-4111-8111-111111111111',
      '2025-06-01',
      '[
        {
          "generation_key": "88888888-8888-4888-8888-888888888888|g|",
          "name": "Spaghetti",
          "quantity": "400",
          "unit": "g",
          "notes": "",
          "store_section": "Pasta",
          "ingredient_id": "88888888-8888-4888-8888-888888888888",
          "sort_order": 0
        }
      ]'::jsonb,
      'Shopping test'
    )$$,
  'regenerate with refreshed quantity succeeds'
);

SELECT is(
  (
    SELECT quantity::text
    FROM public.grocery_list_items
    WHERE list_id = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1'
      AND generation_key = '88888888-8888-4888-8888-888888888888|g|'
  ),
  '400',
  'matching generated item quantity refreshes'
);

SELECT is(
  (
    SELECT is_checked
    FROM public.grocery_list_items
    WHERE list_id = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1'
      AND generation_key = '88888888-8888-4888-8888-888888888888|g|'
  ),
  true,
  'matching generated item keeps checked state'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.grocery_list_items
    WHERE list_id = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1'
      AND generation_key = '88888888-8888-4888-8888-888888888888|g|'
  ),
  1,
  'regenerate does not duplicate a checked matching item'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.grocery_list_items
    WHERE list_id = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1'
      AND generation_key = '99999999-9999-4999-8999-999999999999|tbsp|to coat'
  ),
  0,
  'removed unchecked generated items disappear'
);

-- Idempotent second refresh with same payload.
SELECT lives_ok(
  $$SELECT public.regenerate_grocery_list(
      '11111111-1111-4111-8111-111111111111',
      '2025-06-01',
      '[
        {
          "generation_key": "88888888-8888-4888-8888-888888888888|g|",
          "name": "Spaghetti",
          "quantity": "400",
          "unit": "g",
          "notes": "",
          "store_section": "Pasta",
          "ingredient_id": "88888888-8888-4888-8888-888888888888",
          "sort_order": 0
        }
      ]'::jsonb,
      'Shopping test'
    )$$,
  'second identical regenerate succeeds'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.grocery_list_items
    WHERE list_id = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1'
      AND source = 'generated'
  ),
  1,
  'repeated regenerate does not create duplicate buckets'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.grocery_list_items
    WHERE id = 'd1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1'
  ),
  1,
  'manual items remain after repeated regenerate'
);

-- Non-Sunday week rejected.
SELECT throws_ok(
  $$SELECT public.regenerate_grocery_list(
      '11111111-1111-4111-8111-111111111111',
      '2025-06-02',
      '[]'::jsonb,
      'Nope'
    )$$,
  '23514',
  NULL,
  'regenerate rejects a non-Sunday week_start_on'
);

-- Cross-household ingredient in RPC payload rejected.
-- Under RLS the foreign ingredient is invisible, so the RPC reports it missing
-- (23503) rather than leaking cross-household existence via 23514.
SELECT throws_ok(
  $$SELECT public.regenerate_grocery_list(
      '11111111-1111-4111-8111-111111111111',
      '2025-06-01',
      '[
        {
          "generation_key": "a0000000-0000-4000-8000-000000000001|cup|",
          "name": "Rice",
          "quantity": "1",
          "unit": "cup",
          "notes": "",
          "store_section": "",
          "ingredient_id": "a0000000-0000-4000-8000-000000000001",
          "sort_order": 0
        }
      ]'::jsonb,
      'Shopping test'
    )$$,
  '23503',
  NULL,
  'regenerate rejects cross-household ingredient ids'
);

-- Outsider cannot read household A list.
SELECT public.test_as_user('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.grocery_lists
    WHERE id = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1'
  ),
  0,
  'outsider cannot read another household grocery list'
);

-- ---------------------------------------------------------------------------
-- Milestone 9: subscriptions CRUD, isolation, lifecycle & cadence CHECKs
-- ---------------------------------------------------------------------------
SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

SELECT ok(
  (
    SELECT count(*)::integer >= 6
    FROM public.subscriptions
    WHERE household_id = '11111111-1111-4111-8111-111111111111'
      AND status = 'active'
      AND billing_day BETWEEN 1 AND 31
  ),
  'member can read seeded active subscriptions with billing_day'
);

SELECT ok(
  (
    SELECT count(*)::integer = 1
    FROM public.subscriptions
    WHERE household_id = '11111111-1111-4111-8111-111111111111'
      AND vendor = 'Netflix'
      AND status = 'active'
  ),
  'member can read seeded Netflix subscription'
);

SELECT ok(
  (
    SELECT count(*)::integer = 1
    FROM public.subscriptions
    WHERE household_id = '11111111-1111-4111-8111-111111111111'
      AND vendor = 'Hulu'
      AND status = 'archived'
  ),
  'member can read seeded archived Hulu subscription'
);

SELECT lives_ok(
  $$INSERT INTO public.subscriptions (
      id, household_id, vendor, category_label, amount_cents, cadence,
      billing_day, renewal_on, status
    ) VALUES (
      'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1',
      '11111111-1111-4111-8111-111111111111',
      'pgTAP Streaming',
      'Tech',
      1299,
      'bimonthly',
      31,
      '2026-01-31',
      'active'
    )$$,
  'member can insert subscription with expanded cadence and billing_day 31'
);

SELECT lives_ok(
  $$UPDATE public.subscriptions
    SET vendor = 'pgTAP Streaming Updated', amount_cents = 1399
    WHERE id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1'$$,
  'member can update own subscription'
);

SELECT lives_ok(
  $$UPDATE public.subscriptions
    SET status = 'archived'
    WHERE id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1'$$,
  'member can archive subscription'
);

SELECT is(
  (
    SELECT status
    FROM public.subscriptions
    WHERE id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1'
  ),
  'archived',
  'archived status persists'
);

SELECT lives_ok(
  $$UPDATE public.subscriptions
    SET status = 'active'
    WHERE id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1'$$,
  'member can restore archived subscription'
);

SELECT throws_ok(
  $$INSERT INTO public.subscriptions (
      household_id, vendor, amount_cents, cadence, billing_day, status
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      'Bad Cadence',
      100,
      'custom',
      1,
      'active'
    )$$,
  '23514',
  NULL,
  'cadence CHECK rejects custom'
);

SELECT throws_ok(
  $$INSERT INTO public.subscriptions (
      household_id, vendor, amount_cents, cadence, billing_day, status
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      'Bad Status',
      100,
      'monthly',
      1,
      'paused'
    )$$,
  '23514',
  NULL,
  'status CHECK rejects paused'
);

SELECT throws_ok(
  $$INSERT INTO public.subscriptions (
      household_id, vendor, amount_cents, cadence, billing_day, status
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      'Bad Billing Day',
      100,
      'monthly',
      32,
      'active'
    )$$,
  '23514',
  NULL,
  'billing_day CHECK rejects 32'
);

SELECT throws_ok(
  $$INSERT INTO public.subscriptions (
      household_id, vendor, amount_cents, cadence, billing_day, status
    ) VALUES (
      '22222222-2222-4222-8222-222222222222',
      'Cross Household',
      100,
      'monthly',
      1,
      'active'
    )$$,
  '42501',
  NULL,
  'member cannot insert into another household subscriptions'
);

SELECT public.test_as_user('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.subscriptions
    WHERE household_id = '11111111-1111-4111-8111-111111111111'
  ),
  0,
  'outsider cannot read another household subscriptions'
);

SELECT lives_ok(
  $$UPDATE public.subscriptions
    SET vendor = 'Hijack'
    WHERE id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1'$$,
  'outsider update against foreign subscription is a no-op under RLS'
);

SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

SELECT is(
  (
    SELECT vendor
    FROM public.subscriptions
    WHERE id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1'
  ),
  'pgTAP Streaming Updated',
  'outsider could not change another household subscription vendor'
);

-- ---------------------------------------------------------------------------
-- Dashboard countdowns CRUD + isolation
-- ---------------------------------------------------------------------------
SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

SELECT lives_ok(
  $$INSERT INTO public.countdowns (
      id, household_id, title, target_on, color
    ) VALUES (
      'd1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1',
      '11111111-1111-4111-8111-111111111111',
      'Beach trip',
      '2026-09-01',
      'teal'
    )$$,
  'member can insert household countdown'
);

SELECT lives_ok(
  $$UPDATE public.countdowns
     SET title = 'Beach trip updated'
     WHERE id = 'd1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1'$$,
  'member can update household countdown'
);

SELECT lives_ok(
  $$DELETE FROM public.countdowns
     WHERE id = 'd1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1'$$,
  'member can delete household countdown'
);

SELECT throws_ok(
  $$INSERT INTO public.countdowns (
      household_id, title, target_on
    ) VALUES (
      '22222222-2222-4222-8222-222222222222',
      'Cross household',
      '2026-09-01'
    )$$,
  '42501',
  NULL,
  'member cannot insert into another household countdowns'
);

SELECT public.test_as_user('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.countdowns
    WHERE household_id = '11111111-1111-4111-8111-111111111111'
  ),
  0,
  'outsider cannot read another household countdowns'
);

SELECT public.test_as_anon();

SELECT is(
  (SELECT count(*)::integer FROM public.countdowns),
  0,
  'anonymous cannot read countdowns'
);

SELECT * FROM finish();

ROLLBACK;
