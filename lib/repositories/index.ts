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
  archiveCategory,
  createCategory,
  createTransaction,
  deleteTransaction,
  listCategories,
  listCategoryDisplayMap,
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
  listRecipeCoverUrlsByIds,
  listRecipes,
  updateRecipe,
  uploadRecipeImage,
  type IngredientSuggestion,
  type ListRecipesOptions,
} from "@/lib/repositories/recipes";

export {
  createPlannedMeal,
  createPlannedMeals,
  deletePlannedMeal,
  getPlannedMeal,
  listPlannedMealsForWeek,
  updatePlannedMeal,
} from "@/lib/repositories/meal-plans";

export {
  clearCheckedItems,
  createManualItem,
  deleteGroceryItem,
  generateGroceryListFromMeals,
  getGroceryListForWeek,
  getOrCreateGroceryListForWeek,
  listGroceryItems,
  loadOrSyncShoppingPageData,
  loadShoppingPageData,
  setItemChecked,
  syncShoppingListsForPlanDates,
  updateGroceryItem,
} from "@/lib/repositories/shopping";

export {
  archiveSubscription,
  createSubscription,
  getSubscription,
  listSubscriptions,
  restoreSubscription,
  updateSubscription,
} from "@/lib/repositories/subscriptions";
