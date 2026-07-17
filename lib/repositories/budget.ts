import "server-only";

import {
  budgetCategoryKindSchema,
  budgetCategorySchema,
  budgetMonthLimitSchema,
  createCategoryInputSchema,
  createTransactionInputSchema,
  directionForKind,
  monthEndFor,
  monthStartFor,
  transactionSchema,
  updateTransactionInputSchema,
  upsertMonthLimitInputSchema,
  type BudgetCategory,
  type BudgetCategoryKind,
  type BudgetMonthLimit,
  type CreateCategoryInput,
  type CreateTransactionInput,
  type Transaction,
  type TransactionDirection,
  type UpdateTransactionInput,
  type UpsertMonthLimitInput,
} from "@/lib/domain/budget";
import { requireCurrentMembership } from "@/lib/repositories/households";
import { createClient } from "@/lib/supabase/server";

function mapCategory(row: {
  id: string;
  household_id: string;
  name: string;
  kind: string;
  sort_order: number;
  archived_at: string | null;
}): BudgetCategory {
  return budgetCategorySchema.parse({
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    kind: row.kind,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
  });
}

function mapLimit(row: {
  id: string;
  household_id: string;
  category_id: string;
  month_start: string;
  limit_cents: number;
}): BudgetMonthLimit {
  return budgetMonthLimitSchema.parse({
    id: row.id,
    householdId: row.household_id,
    categoryId: row.category_id,
    monthStart: row.month_start,
    limitCents: row.limit_cents,
  });
}

function mapTransaction(row: {
  id: string;
  household_id: string;
  category_id: string;
  amount_cents: number;
  direction: string;
  occurred_on: string;
  payee: string;
  notes: string;
}): Transaction {
  return transactionSchema.parse({
    id: row.id,
    householdId: row.household_id,
    categoryId: row.category_id,
    amountCents: row.amount_cents,
    direction: row.direction,
    occurredOn: row.occurred_on,
    payee: row.payee,
    notes: row.notes,
  });
}

export async function listCategories(): Promise<BudgetCategory[]> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budget_categories")
    .select("id, household_id, name, kind, sort_order, archived_at")
    .eq("household_id", membership.household.id)
    .is("archived_at", null)
    .order("kind")
    .order("sort_order")
    .order("name");

  if (error) {
    throw new Error("Unable to load budget categories.");
  }

  return (data ?? []).map(mapCategory);
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<BudgetCategory> {
  const membership = await requireCurrentMembership();
  const parsed = createCategoryInputSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budget_categories")
    .insert({
      household_id: membership.household.id,
      name: parsed.name,
      kind: parsed.kind,
    })
    .select("id, household_id, name, kind, sort_order, archived_at")
    .single();

  if (error || !data) {
    throw new Error("Unable to create category.");
  }

  return mapCategory(data);
}

export async function listMonthLimits(
  monthStart: string,
): Promise<BudgetMonthLimit[]> {
  const membership = await requireCurrentMembership();
  const start = monthStartFor(monthStart);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budget_month_limits")
    .select("id, household_id, category_id, month_start, limit_cents")
    .eq("household_id", membership.household.id)
    .eq("month_start", start);

  if (error) {
    throw new Error("Unable to load monthly limits.");
  }

  return (data ?? []).map(mapLimit);
}

export async function upsertMonthLimit(
  input: UpsertMonthLimitInput,
): Promise<BudgetMonthLimit> {
  const membership = await requireCurrentMembership();
  const parsed = upsertMonthLimitInputSchema.parse({
    ...input,
    monthStart: monthStartFor(input.monthStart),
  });
  const supabase = await createClient();

  const { data: category, error: categoryError } = await supabase
    .from("budget_categories")
    .select("id, household_id")
    .eq("id", parsed.categoryId)
    .eq("household_id", membership.household.id)
    .maybeSingle();

  if (categoryError || !category) {
    throw new Error("Category not found.");
  }

  const { data, error } = await supabase
    .from("budget_month_limits")
    .upsert(
      {
        household_id: membership.household.id,
        category_id: parsed.categoryId,
        month_start: parsed.monthStart,
        limit_cents: parsed.limitCents,
      },
      { onConflict: "category_id,month_start" },
    )
    .select("id, household_id, category_id, month_start, limit_cents")
    .single();

  if (error || !data) {
    throw new Error("Unable to save monthly limit.");
  }

  return mapLimit(data);
}

export async function listTransactionsForMonth(
  monthStart: string,
): Promise<Transaction[]> {
  const membership = await requireCurrentMembership();
  const start = monthStartFor(monthStart);
  const end = monthEndFor(start);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, household_id, category_id, amount_cents, direction, occurred_on, payee, notes",
    )
    .eq("household_id", membership.household.id)
    .gte("occurred_on", start)
    .lte("occurred_on", end)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load transactions.");
  }

  return (data ?? []).map(mapTransaction);
}

async function resolveCategoryDirection(
  categoryId: string,
): Promise<{ kind: BudgetCategoryKind; direction: TransactionDirection }> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budget_categories")
    .select("kind")
    .eq("id", categoryId)
    .eq("household_id", membership.household.id)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Category not found.");
  }

  const kind = budgetCategoryKindSchema.parse(data.kind);
  return { kind, direction: directionForKind(kind) };
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  const membership = await requireCurrentMembership();
  const parsed = createTransactionInputSchema.parse(input);
  const { direction } = await resolveCategoryDirection(parsed.categoryId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      household_id: membership.household.id,
      category_id: parsed.categoryId,
      amount_cents: parsed.amountCents,
      direction,
      occurred_on: parsed.occurredOn,
      payee: parsed.payee,
      notes: parsed.notes,
      created_by: membership.userId,
    })
    .select(
      "id, household_id, category_id, amount_cents, direction, occurred_on, payee, notes",
    )
    .single();

  if (error || !data) {
    throw new Error("Unable to add transaction.");
  }

  return mapTransaction(data);
}

export async function updateTransaction(
  input: UpdateTransactionInput,
): Promise<Transaction> {
  const membership = await requireCurrentMembership();
  const parsed = updateTransactionInputSchema.parse(input);
  const { direction } = await resolveCategoryDirection(parsed.categoryId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .update({
      category_id: parsed.categoryId,
      amount_cents: parsed.amountCents,
      direction,
      occurred_on: parsed.occurredOn,
      payee: parsed.payee,
      notes: parsed.notes,
    })
    .eq("household_id", membership.household.id)
    .eq("id", parsed.id)
    .select(
      "id, household_id, category_id, amount_cents, direction, occurred_on, payee, notes",
    )
    .maybeSingle();

  if (error) {
    throw new Error("Unable to update transaction.");
  }

  if (!data) {
    throw new Error("Transaction not found.");
  }

  return mapTransaction(data);
}

export async function deleteTransaction(id: string): Promise<void> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .delete()
    .eq("household_id", membership.household.id)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to delete transaction.");
  }

  if (!data) {
    throw new Error("Transaction not found.");
  }
}
