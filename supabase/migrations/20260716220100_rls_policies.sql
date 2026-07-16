-- Row Level Security and hardened membership helper (Milestone 2).

CREATE OR REPLACE FUNCTION public.is_household_member(target_household_id uuid)
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

REVOKE ALL ON FUNCTION public.is_household_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_household_member(uuid) TO authenticated;

-- Explicit table privileges (Data API does not auto-expose new tables).
-- anon receives privileges so the API role can reach the tables; RLS still
-- denies all anonymous access because no policies target anon.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, UPDATE ON TABLE public.households TO anon, authenticated;
GRANT SELECT ON TABLE public.household_members TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.budget_categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transactions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ingredients TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recipes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recipe_ingredients TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.planned_meals TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.grocery_lists TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.grocery_list_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subscriptions TO anon, authenticated;

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- households: members can read/update; inserts/deletes are secret-key only.
CREATE POLICY households_select_member
  ON public.households
  FOR SELECT
  TO authenticated
  USING (public.is_household_member(id));

CREATE POLICY households_update_member
  ON public.households
  FOR UPDATE
  TO authenticated
  USING (public.is_household_member(id))
  WITH CHECK (public.is_household_member(id));

-- household_members: members can read their household roster only.
CREATE POLICY household_members_select_member
  ON public.household_members
  FOR SELECT
  TO authenticated
  USING (public.is_household_member(household_id));

-- Shared member CRUD pattern for product tables.
CREATE POLICY budget_categories_all_member
  ON public.budget_categories
  FOR ALL
  TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY transactions_all_member
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY ingredients_all_member
  ON public.ingredients
  FOR ALL
  TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY recipes_all_member
  ON public.recipes
  FOR ALL
  TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY recipe_ingredients_all_member
  ON public.recipe_ingredients
  FOR ALL
  TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY planned_meals_all_member
  ON public.planned_meals
  FOR ALL
  TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY grocery_lists_all_member
  ON public.grocery_lists
  FOR ALL
  TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY grocery_list_items_all_member
  ON public.grocery_list_items
  FOR ALL
  TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY subscriptions_all_member
  ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));
