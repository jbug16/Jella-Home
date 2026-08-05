import type { BudgetCategoryKind } from "@/lib/domain/budget";
import type { SubscriptionCadence } from "@/lib/domain/subscription";

export type ParsedIngredientCatalogRow = {
  row: number;
  name: string;
  storeSection: string;
  defaultUnit: string;
};

export type ParsedRecipeIngredientLine = {
  name: string;
  quantity: number | null;
  unit: string;
  sortOrder: number;
  storeSection: string;
};

export type ParsedRecipe = {
  sheetRow: number;
  column: string;
  name: string;
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  sourceUrl: string | null;
  instructions: string;
  notes: string;
  ingredients: ParsedRecipeIngredientLine[];
};

export type ParsedSubscription = {
  row: number;
  vendor: string;
  categoryLabel: string;
  cadence: SubscriptionCadence;
  amountCents: number;
  autoRenew: boolean | null;
  billingDay: number | null;
  renewalOn: string | null;
};

export type ParsedBudgetCategory = {
  name: string;
  kind: BudgetCategoryKind;
  sortOrder: number;
  source: string;
};

export type ParsedBudgetLimit = {
  categoryName: string;
  categoryKind: BudgetCategoryKind;
  monthStart: string;
  limitCents: number;
  source: string;
};

export type ParsedTransaction = {
  categoryKind: BudgetCategoryKind;
  categoryName: string;
  amountCents: number;
  direction: "in" | "out";
  occurredOn: string;
  payee: string;
  notes: string;
  source: string;
};

export type ParsedWorkbook = {
  workbookPath: string;
  sheetNames: string[];
  ingredients: ParsedIngredientCatalogRow[];
  recipes: ParsedRecipe[];
  subscriptions: ParsedSubscription[];
  budgetCategories: ParsedBudgetCategory[];
  budgetLimits: ParsedBudgetLimit[];
  transactions: ParsedTransaction[];
  skippedRecipes: Array<{ name: string; reason: string; source: string }>;
  warnings: string[];
};

/** Insert-ready rows for one-time migration JSON export. */
export type ExtractedIngredient = {
  name: string;
  default_unit: string;
  store_section: string;
};

export type ExtractedRecipe = {
  name: string;
  servings: number;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  instructions: string;
  notes: string;
  source_url: string | null;
};

export type ExtractedRecipeIngredient = {
  recipe_name: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string;
  notes: string;
  sort_order: number;
};

export type ExtractedSubscription = {
  vendor: string;
  category_label: string;
  amount_cents: number;
  cadence: SubscriptionCadence;
  billing_day: number;
  renewal_on: string | null;
  status: "active";
  notes: string;
};

export type ExtractedBudgetCategory = {
  name: string;
  kind: BudgetCategoryKind;
  sort_order: number;
};

export type ExtractedBudgetLimit = {
  category_name: string;
  category_kind: BudgetCategoryKind;
  month_start: string;
  limit_cents: number;
};

export type ExtractedTransaction = {
  category_kind: BudgetCategoryKind;
  category_name: string;
  amount_cents: number;
  direction: "in" | "out";
  occurred_on: string;
  payee: string;
  notes: string;
};

export type WorkbookExtract = {
  ingredients: ExtractedIngredient[];
  recipes: ExtractedRecipe[];
  recipe_ingredients: ExtractedRecipeIngredient[];
  subscriptions: ExtractedSubscription[];
  budget_categories: ExtractedBudgetCategory[];
  budget_limits: ExtractedBudgetLimit[];
  transactions: ExtractedTransaction[];
};

export type ExtractSummary = {
  generated_at: string;
  workbook_path: string;
  output_directory: string;
  counts: {
    ingredients: number;
    recipes: number;
    recipe_ingredients: number;
    subscriptions: number;
    budget_categories: number;
    budget_limits: number;
    transactions: number;
    subscription_monthly_equivalent_cents: number;
  };
  skipped_records: Array<{ domain: string; label: string; reason: string }>;
  duplicate_resolutions: string[];
  warnings: string[];
  assumptions: string[];
  subscriptions_missing_renewal_dates: string[];
  recipes_skipped_no_ingredients: Array<{ name: string; reason: string }>;
};
