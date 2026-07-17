-- pgTAP: household RLS coverage (Milestone 2 + budget schema prep).
-- Requires seeded fake users from supabase/seed.sql.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(25);

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
        'planned_meals',
        'grocery_lists',
        'grocery_list_items',
        'subscriptions'
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
SELECT public.test_as_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

SELECT is(
  (SELECT count(*)::integer FROM public.households),
  1,
  'member can read own household'
);

SELECT is(
  (SELECT count(*)::integer FROM public.transactions),
  1,
  'member can read own household transactions'
);

SELECT is(
  (SELECT count(*)::integer FROM public.budget_month_limits),
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

SELECT * FROM finish();

ROLLBACK;
