import "server-only";

import {
  budgetCategoryKindSchema,
  budgetCategorySchema,
  budgetMonthLimitSchema,
  archiveCategoryInputSchema,
  createCategoryInputSchema,
  createTransactionInputSchema,
  DEFAULT_BUDGET_CATEGORIES,
  deleteTransactionInputSchema,
  directionForKind,
  monthEndFor,
  monthStartFor,
  yearEndFor,
  yearStartFor,
  transactionSchema,
  updateTransactionInputSchema,
  upsertMonthLimitInputSchema,
  type ArchiveCategoryInput,
  type BudgetCategory,
  type BudgetCategoryKind,
  type BudgetMonthLimit,
  type CreateCategoryInput,
  type CreateTransactionInput,
  type DeleteTransactionInput,
  type Transaction,
  type TransactionDirection,
  type UpdateTransactionInput,
  type UpsertMonthLimitInput,
} from "@/lib/domain/budget";
import { ConcurrencyConflictError } from "@/lib/domain/concurrency";
import { toVersionTimestamp } from "@/lib/domain/timestamps";
import { requireCurrentMembership } from "@/lib/repositories/households";
import { createClient } from "@/lib/supabase/server";

const TRANSACTION_COLUMNS =
  "id, household_id, category_id, amount_cents, direction, occurred_on, payee, notes, updated_at";

function mapCategory(row: {
  id: string;
  household_id: string;
  name: string;
  kind: string;
  sort_order: number;
  archived_at: string | null;
  updated_at: string;
}): BudgetCategory {
  return budgetCategorySchema.parse({
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    kind: row.kind,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
    updatedAt: toVersionTimestamp(row.updated_at),
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
  updated_at: string;
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
    updatedAt: toVersionTimestamp(row.updated_at),
  });
}

async function ensureDefaultCategories(householdId: string): Promise<void> {
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("budget_categories")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId);

  if (countError) {
    throw new Error("Unable to load budget categories.");
  }

  if ((count ?? 0) > 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from("budget_categories")
    .insert(
      DEFAULT_BUDGET_CATEGORIES.map((category, index) => ({
        household_id: householdId,
        name: category.name,
        kind: category.kind,
        sort_order: index,
      })),
    );

  if (insertError) {
    throw new Error("Unable to create default budget categories.");
  }
}

export async function listCategories(options?: {
  includeArchived?: boolean;
}): Promise<BudgetCategory[]> {
  const membership = await requireCurrentMembership();
  await ensureDefaultCategories(membership.household.id);
  const supabase = await createClient();

  let query = supabase
    .from("budget_categories")
    .select("id, household_id, name, kind, sort_order, archived_at, updated_at")
    .eq("household_id", membership.household.id)
    .order("kind")
    .order("sort_order")
    .order("name");
  if (!options?.includeArchived) query = query.is("archived_at", null);
  const { data, error } = await query;

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
    .select("id, household_id, name, kind, sort_order, archived_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error("Unable to create category.");
  }

  return mapCategory(data);
}

/** Labels for active and archived categories (transaction display). */
export async function listCategoryDisplayMap(): Promise<
  Record<string, { name: string; kind: BudgetCategoryKind }>
> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budget_categories")
    .select("id, name, kind")
    .eq("household_id", membership.household.id);

  if (error) {
    throw new Error("Unable to load budget categories.");
  }

  const map: Record<string, { name: string; kind: BudgetCategoryKind }> = {};
  for (const row of data ?? []) {
    map[row.id] = {
      name: row.name,
      kind: budgetCategoryKindSchema.parse(row.kind),
    };
  }
  return map;
}

export async function archiveCategory(
  input: ArchiveCategoryInput,
): Promise<void> {
  const membership = await requireCurrentMembership();
  const parsed = archiveCategoryInputSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budget_categories")
    .update({ archived_at: new Date().toISOString() })
    .eq("household_id", membership.household.id)
    .eq("id", parsed.id)
    .is("archived_at", null)
    .eq("updated_at", parsed.expectedUpdatedAt)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to delete category.");
  }

  if (!data) {
    throw new ConcurrencyConflictError();
  }
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
    .select(TRANSACTION_COLUMNS)
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

export async function listTransactionsForYear(
  year: number,
): Promise<Transaction[]> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .eq("household_id", membership.household.id)
    .gte("occurred_on", yearStartFor(year))
    .lte("occurred_on", yearEndFor(year))
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load yearly transactions.");
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
    .select(TRANSACTION_COLUMNS)
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
    .eq("updated_at", parsed.expectedUpdatedAt)
    .select(TRANSACTION_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to update transaction.");
  }

  if (!data) {
    throw new ConcurrencyConflictError();
  }

  return mapTransaction(data);
}

export async function deleteTransaction(
  input: DeleteTransactionInput | string,
  expectedUpdatedAt?: string,
): Promise<void> {
  const membership = await requireCurrentMembership();
  const parsed =
    typeof input === "string"
      ? deleteTransactionInputSchema.parse({ id: input, expectedUpdatedAt })
      : deleteTransactionInputSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .delete()
    .eq("household_id", membership.household.id)
    .eq("id", parsed.id)
    .eq("updated_at", parsed.expectedUpdatedAt)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to delete transaction.");
  }

  if (!data) {
    throw new ConcurrencyConflictError();
  }
}
