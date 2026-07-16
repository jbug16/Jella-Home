-- Indexes for foreign keys not already covered by PRIMARY/UNIQUE keys.
-- Improves join/delete performance and satisfies common Performance Advisor checks.

CREATE INDEX IF NOT EXISTS household_members_user_id_idx
  ON public.household_members (user_id);

CREATE INDEX IF NOT EXISTS budget_categories_household_id_idx
  ON public.budget_categories (household_id);

CREATE INDEX IF NOT EXISTS ingredients_household_id_idx
  ON public.ingredients (household_id);

CREATE INDEX IF NOT EXISTS recipes_household_id_idx
  ON public.recipes (household_id);

CREATE INDEX IF NOT EXISTS recipe_ingredients_recipe_id_idx
  ON public.recipe_ingredients (recipe_id);

CREATE INDEX IF NOT EXISTS recipe_ingredients_ingredient_id_idx
  ON public.recipe_ingredients (ingredient_id);

CREATE INDEX IF NOT EXISTS recipe_ingredients_household_id_idx
  ON public.recipe_ingredients (household_id);

CREATE INDEX IF NOT EXISTS planned_meals_recipe_id_idx
  ON public.planned_meals (recipe_id);

CREATE INDEX IF NOT EXISTS grocery_lists_household_id_idx
  ON public.grocery_lists (household_id);

CREATE INDEX IF NOT EXISTS grocery_list_items_household_id_idx
  ON public.grocery_list_items (household_id);

CREATE INDEX IF NOT EXISTS grocery_list_items_ingredient_id_idx
  ON public.grocery_list_items (ingredient_id);

CREATE INDEX IF NOT EXISTS grocery_list_items_recipe_id_idx
  ON public.grocery_list_items (recipe_id);

CREATE INDEX IF NOT EXISTS subscriptions_household_id_idx
  ON public.subscriptions (household_id);

CREATE INDEX IF NOT EXISTS subscriptions_category_id_idx
  ON public.subscriptions (category_id);

CREATE INDEX IF NOT EXISTS transactions_created_by_idx
  ON public.transactions (created_by);
