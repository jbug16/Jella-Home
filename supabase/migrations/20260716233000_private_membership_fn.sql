-- Move is_household_member out of the API-exposed public schema.
-- Fixes Security Advisor: anon/authenticated SECURITY DEFINER RPC exposure.
-- Policies still call it; authenticated retains EXECUTE for RLS evaluation.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

CREATE OR REPLACE FUNCTION private.is_household_member(target_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members AS hm
    WHERE hm.household_id = target_household_id
      AND hm.user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION private.is_household_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_household_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION private.is_household_member(uuid) TO authenticated;

-- Drop public policies that referenced public.is_household_member, then recreate.
DROP POLICY IF EXISTS households_select_member ON public.households;
DROP POLICY IF EXISTS households_update_member ON public.households;
DROP POLICY IF EXISTS household_members_select_member ON public.household_members;
DROP POLICY IF EXISTS budget_categories_all_member ON public.budget_categories;
DROP POLICY IF EXISTS transactions_all_member ON public.transactions;
DROP POLICY IF EXISTS ingredients_all_member ON public.ingredients;
DROP POLICY IF EXISTS recipes_all_member ON public.recipes;
DROP POLICY IF EXISTS recipe_ingredients_all_member ON public.recipe_ingredients;
DROP POLICY IF EXISTS planned_meals_all_member ON public.planned_meals;
DROP POLICY IF EXISTS grocery_lists_all_member ON public.grocery_lists;
DROP POLICY IF EXISTS grocery_list_items_all_member ON public.grocery_list_items;
DROP POLICY IF EXISTS subscriptions_all_member ON public.subscriptions;

DROP FUNCTION IF EXISTS public.is_household_member(uuid);

CREATE POLICY households_select_member
  ON public.households
  FOR SELECT
  TO authenticated
  USING (private.is_household_member(id));

CREATE POLICY households_update_member
  ON public.households
  FOR UPDATE
  TO authenticated
  USING (private.is_household_member(id))
  WITH CHECK (private.is_household_member(id));

CREATE POLICY household_members_select_member
  ON public.household_members
  FOR SELECT
  TO authenticated
  USING (private.is_household_member(household_id));

CREATE POLICY budget_categories_all_member
  ON public.budget_categories
  FOR ALL
  TO authenticated
  USING (private.is_household_member(household_id))
  WITH CHECK (private.is_household_member(household_id));

CREATE POLICY transactions_all_member
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (private.is_household_member(household_id))
  WITH CHECK (private.is_household_member(household_id));

CREATE POLICY ingredients_all_member
  ON public.ingredients
  FOR ALL
  TO authenticated
  USING (private.is_household_member(household_id))
  WITH CHECK (private.is_household_member(household_id));

CREATE POLICY recipes_all_member
  ON public.recipes
  FOR ALL
  TO authenticated
  USING (private.is_household_member(household_id))
  WITH CHECK (private.is_household_member(household_id));

CREATE POLICY recipe_ingredients_all_member
  ON public.recipe_ingredients
  FOR ALL
  TO authenticated
  USING (private.is_household_member(household_id))
  WITH CHECK (private.is_household_member(household_id));

CREATE POLICY planned_meals_all_member
  ON public.planned_meals
  FOR ALL
  TO authenticated
  USING (private.is_household_member(household_id))
  WITH CHECK (private.is_household_member(household_id));

CREATE POLICY grocery_lists_all_member
  ON public.grocery_lists
  FOR ALL
  TO authenticated
  USING (private.is_household_member(household_id))
  WITH CHECK (private.is_household_member(household_id));

CREATE POLICY grocery_list_items_all_member
  ON public.grocery_list_items
  FOR ALL
  TO authenticated
  USING (private.is_household_member(household_id))
  WITH CHECK (private.is_household_member(household_id));

CREATE POLICY subscriptions_all_member
  ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (private.is_household_member(household_id))
  WITH CHECK (private.is_household_member(household_id));
