-- Local-only seed data. Uses fake emails and fixed UUIDs for RLS testing.
-- Never put real household emails or production Auth user IDs here.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Fixed fake user IDs for deterministic local tests (valid UUID v4 shape).
-- member_a / member_b belong to household_a
-- outsider belongs to household_b (cross-household denial cases)
-- non_member has auth but no household_members row

DO $$
DECLARE
  member_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  member_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  outsider uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  non_member uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  household_a uuid := '11111111-1111-4111-8111-111111111111';
  household_b uuid := '22222222-2222-4222-8222-222222222222';
  category_a uuid := '33333333-3333-4333-8333-333333333333';
  category_b uuid := '44444444-4444-4444-8444-444444444444';
  password_hash text := crypt('local-dev-password', gen_salt('bf'));
BEGIN
  DELETE FROM auth.identities
  WHERE user_id IN (member_a, member_b, outsider, non_member);
  DELETE FROM auth.users
  WHERE id IN (member_a, member_b, outsider, non_member);

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000000',
      member_a,
      'authenticated',
      'authenticated',
      'member-a@example.test',
      password_hash,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      member_b,
      'authenticated',
      'authenticated',
      'member-b@example.test',
      password_hash,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      outsider,
      'authenticated',
      'authenticated',
      'outsider@example.test',
      password_hash,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      non_member,
      'authenticated',
      'authenticated',
      'non-member@example.test',
      password_hash,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES
    (
      member_a,
      member_a,
      format('{"sub":"%s","email":"member-a@example.test"}', member_a)::jsonb,
      'email',
      member_a::text,
      now(),
      now(),
      now()
    ),
    (
      member_b,
      member_b,
      format('{"sub":"%s","email":"member-b@example.test"}', member_b)::jsonb,
      'email',
      member_b::text,
      now(),
      now(),
      now()
    ),
    (
      outsider,
      outsider,
      format('{"sub":"%s","email":"outsider@example.test"}', outsider)::jsonb,
      'email',
      outsider::text,
      now(),
      now(),
      now()
    ),
    (
      non_member,
      non_member,
      format('{"sub":"%s","email":"non-member@example.test"}', non_member)::jsonb,
      'email',
      non_member::text,
      now(),
      now(),
      now()
    );

  INSERT INTO public.households (id, name)
  VALUES
    (household_a, 'Local Fixture Household A'),
    (household_b, 'Local Fixture Household B');

  INSERT INTO public.household_members (
    household_id,
    user_id,
    display_name,
    role
  )
  VALUES
    (household_a, member_a, 'Member A', 'owner'),
    (household_a, member_b, 'Member B', 'member'),
    (household_b, outsider, 'Outsider', 'owner');

  INSERT INTO public.budget_categories (id, household_id, name, kind)
  VALUES
    (category_a, household_a, 'Groceries', 'expense'),
    (category_b, household_b, 'Groceries', 'expense');

  INSERT INTO public.transactions (
    household_id,
    category_id,
    amount_cents,
    direction,
    occurred_on,
    payee
  )
  VALUES
    (household_a, category_a, 1250, 'out', CURRENT_DATE, 'Fixture Store A'),
    (household_b, category_b, 9900, 'out', CURRENT_DATE, 'Fixture Store B');
END $$;
