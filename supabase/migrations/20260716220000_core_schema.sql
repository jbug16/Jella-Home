-- Jella Home core schema (Milestone 2)
-- Schema and indexes only. No real user emails or production Auth UUIDs.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id),
  UNIQUE (user_id)
);

CREATE TABLE public.budget_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income', 'expense', 'bill', 'savings', 'debt')),
  sort_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, name)
);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.budget_categories (id),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  occurred_on date NOT NULL,
  payee text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid NULL REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  name text NOT NULL,
  default_unit text NOT NULL DEFAULT '',
  store_section text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, name)
);

CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  name text NOT NULL,
  servings numeric NOT NULL DEFAULT 2 CHECK (servings > 0),
  instructions text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  source_url text NULL,
  archived_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients (id),
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.planned_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  meal_slot text NOT NULL CHECK (
    meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')
  ),
  recipe_id uuid NULL REFERENCES public.recipes (id) ON DELETE SET NULL,
  custom_title text NULL,
  servings numeric NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (recipe_id IS NOT NULL OR custom_title IS NOT NULL)
);

CREATE TABLE public.grocery_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  name text NOT NULL,
  week_start_on date NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.grocery_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  list_id uuid NOT NULL REFERENCES public.grocery_lists (id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric NULL,
  unit text NOT NULL DEFAULT '',
  store_section text NOT NULL DEFAULT '',
  is_checked boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'generated')),
  ingredient_id uuid NULL REFERENCES public.ingredients (id) ON DELETE SET NULL,
  recipe_id uuid NULL REFERENCES public.recipes (id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  vendor text NOT NULL,
  category_id uuid NULL REFERENCES public.budget_categories (id) ON DELETE SET NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  cadence text NOT NULL CHECK (
    cadence IN ('weekly', 'monthly', 'quarterly', 'yearly')
  ),
  renewal_on date NULL,
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'paused', 'canceled')
  ),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX transactions_household_occurred_on_idx
  ON public.transactions (household_id, occurred_on DESC);
CREATE INDEX transactions_household_category_id_idx
  ON public.transactions (household_id, category_id);
CREATE INDEX planned_meals_household_plan_date_idx
  ON public.planned_meals (household_id, plan_date);
CREATE INDEX grocery_list_items_list_id_idx
  ON public.grocery_list_items (list_id);
CREATE INDEX household_members_household_id_idx
  ON public.household_members (household_id);

CREATE TRIGGER households_set_updated_at
  BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER budget_categories_set_updated_at
  BEFORE UPDATE ON public.budget_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER transactions_set_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER ingredients_set_updated_at
  BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER recipes_set_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER planned_meals_set_updated_at
  BEFORE UPDATE ON public.planned_meals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER grocery_lists_set_updated_at
  BEFORE UPDATE ON public.grocery_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER grocery_list_items_set_updated_at
  BEFORE UPDATE ON public.grocery_list_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
