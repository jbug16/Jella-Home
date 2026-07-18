/**
 * Typed domain repositories.
 *
 * Conventions:
 * - Import `createClient` from `lib/supabase/server` (cookie-backed SSR).
 * - Never use `createAdminClient` in normal repositories.
 * - Validate inputs/outputs with Zod domain schemas.
 * - UI routes and Server Actions call repositories; they do not query Supabase.
 */

export {
  getCurrentMembership,
  requireCurrentMembership,
} from "@/lib/repositories/households";

export {
  createCategory,
  createTransaction,
  deleteTransaction,
  listCategories,
  listMonthLimits,
  listTransactionsForMonth,
  updateTransaction,
  upsertMonthLimit,
} from "@/lib/repositories/budget";

export {
  archiveRecipe,
  createRecipe,
  deleteRecipeImage,
  getRecipe,
  listIngredientSuggestions,
  listRecipes,
  setRecipeImagePath,
  updateRecipe,
  uploadRecipeImage,
  type IngredientSuggestion,
  type ListRecipesOptions,
} from "@/lib/repositories/recipes";
