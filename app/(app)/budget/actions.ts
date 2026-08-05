"use server";

import { revalidateModuleAndDashboard } from "@/lib/dashboard/revalidate";
import {
  createCategoryInputSchema,
  createTransactionInputSchema,
  deleteTransactionInputSchema,
  parseDollarInputToCents,
  parseDollarInputToNonNegativeCents,
  updateTransactionInputSchema,
  upsertMonthLimitInputSchema,
} from "@/lib/domain/budget";
import { isConcurrencyConflictError } from "@/lib/domain/concurrency";
import {
  createCategory,
  createTransaction,
  deleteTransaction,
  updateTransaction,
  upsertMonthLimit,
} from "@/lib/repositories/budget";

export type BudgetActionState = {
  error: string | null;
  success: string | null;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function conflictOr(error: unknown, fallback: string): BudgetActionState {
  if (isConcurrencyConflictError(error)) {
    return { error: error.message, success: null };
  }
  return { error: fallback, success: null };
}

export async function createCategoryAction(
  _previous: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const parsed = createCategoryInputSchema.safeParse({
    name: formString(formData, "name"),
    kind: formString(formData, "kind"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to create category.",
      success: null,
    };
  }

  try {
    await createCategory(parsed.data);
  } catch {
    return { error: "Unable to create category.", success: null };
  }

  revalidateModuleAndDashboard("/budget");
  return { error: null, success: "Category added." };
}

export async function upsertMonthLimitAction(
  _previous: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  let limitCents: number;
  try {
    limitCents = parseDollarInputToNonNegativeCents(
      formString(formData, "limitDollars"),
    );
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Enter a valid limit amount.",
      success: null,
    };
  }

  const parsed = upsertMonthLimitInputSchema.safeParse({
    categoryId: formString(formData, "categoryId"),
    monthStart: formString(formData, "monthStart"),
    limitCents,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to save limit.",
      success: null,
    };
  }

  try {
    await upsertMonthLimit(parsed.data);
  } catch {
    return { error: "Unable to save monthly limit.", success: null };
  }

  revalidateModuleAndDashboard("/budget");
  return { error: null, success: "Limit saved." };
}

function parseTransactionForm(formData: FormData) {
  let amountCents: number;
  try {
    amountCents = parseDollarInputToCents(
      formString(formData, "amountDollars"),
    );
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Enter a valid amount.",
    };
  }

  return {
    success: true as const,
    data: {
      categoryId: formString(formData, "categoryId"),
      amountCents,
      occurredOn: formString(formData, "occurredOn"),
      payee: formString(formData, "payee"),
      notes: formString(formData, "notes"),
    },
  };
}

export async function createTransactionAction(
  _previous: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const formParsed = parseTransactionForm(formData);
  if (!formParsed.success) {
    return { error: formParsed.error, success: null };
  }

  const parsed = createTransactionInputSchema.safeParse(formParsed.data);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to add transaction.",
      success: null,
    };
  }

  try {
    await createTransaction(parsed.data);
  } catch {
    return { error: "Unable to add transaction.", success: null };
  }

  revalidateModuleAndDashboard("/budget");
  return { error: null, success: "Transaction added." };
}

export async function updateTransactionAction(
  _previous: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const formParsed = parseTransactionForm(formData);
  if (!formParsed.success) {
    return { error: formParsed.error, success: null };
  }

  const parsed = updateTransactionInputSchema.safeParse({
    id: formString(formData, "id"),
    expectedUpdatedAt: formString(formData, "expectedUpdatedAt"),
    ...formParsed.data,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to update transaction.",
      success: null,
    };
  }

  try {
    await updateTransaction(parsed.data);
  } catch (error) {
    return conflictOr(error, "Unable to update transaction.");
  }

  revalidateModuleAndDashboard("/budget");
  return { error: null, success: "Transaction updated." };
}

export async function deleteTransactionAction(
  _previous: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const parsed = deleteTransactionInputSchema.safeParse({
    id: formString(formData, "id"),
    expectedUpdatedAt: formString(formData, "expectedUpdatedAt"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Transaction not found.",
      success: null,
    };
  }

  try {
    await deleteTransaction(parsed.data);
  } catch (error) {
    return conflictOr(error, "Unable to delete transaction.");
  }

  revalidateModuleAndDashboard("/budget");
  return { error: null, success: "Transaction deleted." };
}
