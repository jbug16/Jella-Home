/**
 * Shared domain schemas and types.
 */

export {
  householdMemberRoleSchema,
  householdMembershipSchema,
  householdSchema,
  type Household,
  type HouseholdMemberRole,
  type HouseholdMembership,
} from "@/lib/domain/household";

export {
  budgetCategoryKindSchema,
  budgetCategorySchema,
  budgetMonthLimitSchema,
  buildBudgetMonthSnapshot,
  createCategoryInputSchema,
  createTransactionInputSchema,
  currentMonthStart,
  defaultOccurredOnForMonth,
  directionForKind,
  formatCents,
  formatMonthLabel,
  monthEndFor,
  monthStartFor,
  parseDollarInputToCents,
  parseDollarInputToNonNegativeCents,
  shiftMonthStart,
  todayIsoDate,
  transactionDirectionSchema,
  transactionSchema,
  updateTransactionInputSchema,
  upsertMonthLimitInputSchema,
  type BudgetCategory,
  type BudgetCategoryKind,
  type BudgetMonthLimit,
  type BudgetMonthSnapshot,
  type CategorySummary,
  type CreateCategoryInput,
  type CreateTransactionInput,
  type KindSummary,
  type Transaction,
  type TransactionDirection,
  type UpdateTransactionInput,
  type UpsertMonthLimitInput,
} from "@/lib/domain/budget";
