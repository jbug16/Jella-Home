import { z } from "zod";

import {
  isoDateSchema,
  resolveMonthStartParam,
  todayIsoDate,
} from "@/lib/domain/dates";
import { expectedUpdatedAtSchema } from "@/lib/domain/concurrency";

export { isoDateSchema, todayIsoDate } from "@/lib/domain/dates";

/** Category kinds matching Postgres CHECK and the legacy workbook. */
export const budgetCategoryKindSchema = z.enum([
  "income",
  "expense",
  "bill",
  "savings",
  "debt",
]);

export type BudgetCategoryKind = z.infer<typeof budgetCategoryKindSchema>;

/** Starter categories for households with none yet. */
export const DEFAULT_BUDGET_CATEGORIES: ReadonlyArray<{
  name: string;
  kind: BudgetCategoryKind;
}> = [
  { name: "Food", kind: "expense" },
  { name: "Gas", kind: "expense" },
  { name: "Bills", kind: "bill" },
  { name: "Fun", kind: "expense" },
];

export const transactionDirectionSchema = z.enum(["in", "out"]);

export type TransactionDirection = z.infer<typeof transactionDirectionSchema>;

/** Positive integer cents only — reject zero and negatives at validation. */
export const positiveCentsSchema = z
  .number()
  .int("Amount must be a whole number of cents.")
  .positive("Amount must be greater than zero.");

export const nonNegativeCentsSchema = z
  .number()
  .int("Amount must be a whole number of cents.")
  .nonnegative("Amount cannot be negative.");

export const budgetCategorySchema = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  name: z.string().trim().min(1, "Category name is required."),
  kind: budgetCategoryKindSchema,
  sortOrder: z.number().int(),
  archivedAt: z.string().nullable(),
  updatedAt: z.string(),
});

export type BudgetCategory = z.infer<typeof budgetCategorySchema>;

export const budgetMonthLimitSchema = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  categoryId: z.uuid(),
  monthStart: isoDateSchema,
  limitCents: nonNegativeCentsSchema,
});

export type BudgetMonthLimit = z.infer<typeof budgetMonthLimitSchema>;

export const transactionSchema = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  categoryId: z.uuid(),
  amountCents: positiveCentsSchema,
  direction: transactionDirectionSchema,
  occurredOn: isoDateSchema,
  payee: z.string(),
  notes: z.string(),
  updatedAt: z.string(),
});

export type Transaction = z.infer<typeof transactionSchema>;

export const createCategoryInputSchema = z.object({
  name: z.string().trim().min(1, "Category name is required.").max(80),
  kind: budgetCategoryKindSchema,
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const upsertMonthLimitInputSchema = z.object({
  categoryId: z.uuid(),
  monthStart: isoDateSchema,
  limitCents: nonNegativeCentsSchema,
});

export type UpsertMonthLimitInput = z.infer<typeof upsertMonthLimitInputSchema>;

export const createTransactionInputSchema = z.object({
  categoryId: z.uuid(),
  amountCents: positiveCentsSchema,
  occurredOn: isoDateSchema,
  payee: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(500).default(""),
});

export type CreateTransactionInput = z.infer<
  typeof createTransactionInputSchema
>;

export const updateTransactionInputSchema = createTransactionInputSchema.extend(
  {
    id: z.uuid(),
    expectedUpdatedAt: expectedUpdatedAtSchema,
  },
);

export const deleteTransactionInputSchema = z.object({
  id: z.uuid(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export type DeleteTransactionInput = z.infer<
  typeof deleteTransactionInputSchema
>;

export const archiveCategoryInputSchema = z.object({
  id: z.uuid(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export type ArchiveCategoryInput = z.infer<typeof archiveCategoryInputSchema>;

export type UpdateTransactionInput = z.infer<
  typeof updateTransactionInputSchema
>;

const KIND_DIRECTION: Record<BudgetCategoryKind, TransactionDirection> = {
  income: "in",
  expense: "out",
  bill: "out",
  savings: "out",
  debt: "out",
};

export function directionForKind(
  kind: BudgetCategoryKind,
): TransactionDirection {
  return KIND_DIRECTION[kind];
}

/** Color treatment for transaction amounts in lists. */
export type TransactionAmountTone = "income" | "spending" | "neutral";

export function transactionAmountTone(
  kind: BudgetCategoryKind | undefined,
  direction: TransactionDirection,
): TransactionAmountTone {
  if (kind === "income") {
    return "income";
  }
  if (kind === "expense" || kind === "bill") {
    return "spending";
  }
  if (kind === "savings" || kind === "debt") {
    return "neutral";
  }
  return direction === "in" ? "income" : "neutral";
}

/**
 * Parse a user-facing dollar string into positive integer cents.
 * Accepts "12", "12.5", "12.50", "$12.50". Rejects empty, negative, and
 * more than two decimal places.
 */
export function parseDollarInputToCents(raw: string): number {
  const trimmed = raw.trim().replace(/\$/g, "").replace(/,/g, "");
  if (!trimmed) {
    throw new Error("Enter an amount.");
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error("Enter a valid dollar amount (up to two decimals).");
  }
  const negative = trimmed.startsWith("-");
  const absolute = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fractionPart = ""] = absolute.split(".");
  const whole = Number(wholePart);
  const fraction = Number((fractionPart + "00").slice(0, 2));
  const cents = whole * 100 + fraction;
  if (negative || cents <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
  return cents;
}

/**
 * Parse a user-facing dollar string into non-negative integer cents.
 * Allows zero (for clearing a planned limit). Rejects negatives.
 */
export function parseDollarInputToNonNegativeCents(raw: string): number {
  const trimmed = raw.trim().replace(/\$/g, "").replace(/,/g, "");
  if (!trimmed) {
    throw new Error("Enter an amount.");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error("Enter a valid dollar amount (up to two decimals).");
  }
  const [wholePart, fractionPart = ""] = trimmed.split(".");
  const whole = Number(wholePart);
  const fraction = Number((fractionPart + "00").slice(0, 2));
  return whole * 100 + fraction;
}

/** Format integer cents as a household-friendly currency string. */
export function formatCents(
  cents: number,
  options?: { signed?: boolean },
): string {
  const signed = options?.signed ?? false;
  const absolute = Math.abs(cents);
  const dollars = (absolute / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
  if (!signed) {
    return dollars;
  }
  if (cents < 0) {
    return `-${dollars}`;
  }
  if (cents > 0) {
    return `+${dollars}`;
  }
  return dollars;
}

/** First day of the month containing `isoDate` (YYYY-MM or YYYY-MM-DD). */
export function monthStartFor(isoDate: string): string {
  const resolved = resolveMonthStartParam(isoDate);
  if (!resolved) {
    throw new Error("Use a valid calendar month.");
  }
  return resolved;
}

export function currentMonthStart(now = new Date()): string {
  return monthStartFor(todayIsoDate(now));
}

/** Add `delta` months to a month_start (YYYY-MM-01). */
export function shiftMonthStart(monthStart: string, delta: number): string {
  const start = monthStartFor(monthStart);
  const [yearText, monthText] = start.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1 + delta;
  const date = new Date(year, monthIndex, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}-01`;
}

/** Inclusive end date (YYYY-MM-DD) for a month_start. */
export function monthEndFor(monthStart: string): string {
  const start = monthStartFor(monthStart);
  const next = shiftMonthStart(start, 1);
  const [yearText, monthText, dayText] = next.split("-");
  const end = new Date(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText) - 1,
  );
  const year = end.getFullYear();
  const month = String(end.getMonth() + 1).padStart(2, "0");
  const day = String(end.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Default transaction date when adding into a viewed month.
 * Uses today when it falls in that month; otherwise clamps to the month bounds.
 */
export function defaultOccurredOnForMonth(
  monthStart: string,
  todayIso: string,
): string {
  const start = monthStartFor(monthStart);
  const end = monthEndFor(start);
  const today = isoDateSchema.parse(todayIso);
  if (today >= start && today <= end) {
    return today;
  }
  if (today < start) {
    return start;
  }
  return end;
}

export function formatMonthLabel(monthStart: string): string {
  const start = monthStartFor(monthStart);
  const [yearText, monthText] = start.split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export const budgetViewSchema = z.enum(["month", "year"]);
export type BudgetPeriodView = z.infer<typeof budgetViewSchema>;

export function currentBudgetYear(now = new Date()): number {
  return Number(todayIsoDate(now).slice(0, 4));
}

export function resolveBudgetYear(
  raw: string | null | undefined,
): number | null {
  if (!raw || !/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  return year >= 1900 && year <= 2200 ? year : null;
}

export function yearStartFor(year: number): string {
  const parsed = resolveBudgetYear(String(year));
  if (!parsed) throw new Error("Use a valid calendar year.");
  return `${parsed}-01-01`;
}

export function yearEndFor(year: number): string {
  const parsed = resolveBudgetYear(String(year));
  if (!parsed) throw new Error("Use a valid calendar year.");
  return `${parsed}-12-31`;
}

export type BudgetPeriod =
  | { view: "month"; monthStart: string; canonicalQuery: string }
  | { view: "year"; year: number; canonicalQuery: string };

export function resolveBudgetPeriod(args: {
  view?: string | null;
  month?: string | null;
  year?: string | null;
  now?: Date;
}): BudgetPeriod {
  const view = budgetViewSchema.safeParse(args.view).success
    ? (args.view as BudgetPeriodView)
    : "month";
  if (view === "year") {
    const year = resolveBudgetYear(args.year) ?? currentBudgetYear(args.now);
    return { view, year, canonicalQuery: `view=year&year=${year}` };
  }
  const monthStart =
    resolveMonthStartParam(args.month) ?? currentMonthStart(args.now);
  return {
    view,
    monthStart,
    canonicalQuery: `view=month&month=${monthStart.slice(0, 7)}`,
  };
}

export type KindSummary = {
  kind: BudgetCategoryKind;
  plannedCents: number;
  actualCents: number;
  remainingCents: number;
};

export type CategorySummary = {
  categoryId: string;
  name: string;
  kind: BudgetCategoryKind;
  plannedCents: number;
  actualCents: number;
  remainingCents: number;
};

export type BudgetMonthSnapshot = {
  monthStart: string;
  kindSummaries: KindSummary[];
  categorySummaries: CategorySummary[];
  plannedTotalCents: number;
  actualOutCents: number;
  actualInCents: number;
  remainingOutCents: number;
};

export type BudgetYearSnapshot = {
  year: number;
  categorySummaries: Array<{
    categoryId: string;
    name: string;
    kind: BudgetCategoryKind;
    actualCents: number;
  }>;
  spendingCents: number;
  incomeCents: number;
  savingsCents: number;
  debtCents: number;
};

export function buildBudgetYearSnapshot(args: {
  year: number;
  categories: BudgetCategory[];
  transactions: Transaction[];
}): BudgetYearSnapshot {
  const start = yearStartFor(args.year);
  const end = yearEndFor(args.year);
  const categoriesById = new Map(args.categories.map((row) => [row.id, row]));
  const actualByCategory = new Map<string, number>();

  for (const transaction of args.transactions) {
    if (transaction.occurredOn < start || transaction.occurredOn > end)
      continue;
    const category = categoriesById.get(transaction.categoryId);
    if (!category || transaction.direction !== directionForKind(category.kind))
      continue;
    actualByCategory.set(
      category.id,
      (actualByCategory.get(category.id) ?? 0) + transaction.amountCents,
    );
  }

  const categorySummaries = args.categories
    .map((category) => ({
      categoryId: category.id,
      name: category.name,
      kind: category.kind,
      actualCents: actualByCategory.get(category.id) ?? 0,
    }))
    .filter((row) => row.actualCents > 0)
    .sort(
      (a, b) => b.actualCents - a.actualCents || a.name.localeCompare(b.name),
    );

  const total = (...kinds: BudgetCategoryKind[]) =>
    categorySummaries
      .filter((row) => kinds.includes(row.kind))
      .reduce((sum, row) => sum + row.actualCents, 0);

  return {
    year: args.year,
    categorySummaries,
    spendingCents: total("expense", "bill"),
    incomeCents: total("income"),
    savingsCents: total("savings"),
    debtCents: total("debt"),
  };
}

/**
 * Derive planned / actual / remaining for a month. Does not persist anything.
 * Actuals for outgoing kinds sum `out` transactions; income sums `in`.
 * Remaining = planned − actual (can be negative when overspent).
 */
export function buildBudgetMonthSnapshot(args: {
  monthStart: string;
  categories: BudgetCategory[];
  limits: BudgetMonthLimit[];
  transactions: Transaction[];
}): BudgetMonthSnapshot {
  const monthStart = monthStartFor(args.monthStart);
  const monthEnd = monthEndFor(monthStart);
  const activeCategories = args.categories.filter((c) => c.archivedAt === null);

  const limitsByCategory = new Map(
    args.limits
      .filter((limit) => limit.monthStart === monthStart)
      .map((limit) => [limit.categoryId, limit.limitCents]),
  );

  const monthTransactions = args.transactions.filter(
    (txn) => txn.occurredOn >= monthStart && txn.occurredOn <= monthEnd,
  );

  const categoryById = new Map(
    activeCategories.map((category) => [category.id, category]),
  );

  const actualByCategory = new Map<string, number>();
  for (const txn of monthTransactions) {
    const category = categoryById.get(txn.categoryId);
    if (!category) {
      continue;
    }
    if (txn.direction !== directionForKind(category.kind)) {
      continue;
    }
    const previous = actualByCategory.get(txn.categoryId) ?? 0;
    actualByCategory.set(txn.categoryId, previous + txn.amountCents);
  }

  const categorySummaries: CategorySummary[] = activeCategories
    .map((category) => {
      const plannedCents = limitsByCategory.get(category.id) ?? 0;
      const actualCents = actualByCategory.get(category.id) ?? 0;
      return {
        categoryId: category.id,
        name: category.name,
        kind: category.kind,
        plannedCents,
        actualCents,
        remainingCents: plannedCents - actualCents,
      };
    })
    .sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind.localeCompare(b.kind);
      }
      return a.name.localeCompare(b.name);
    });

  const kinds = budgetCategoryKindSchema.options;
  const kindSummaries: KindSummary[] = kinds.map((kind) => {
    const rows = categorySummaries.filter((row) => row.kind === kind);
    const plannedCents = rows.reduce((sum, row) => sum + row.plannedCents, 0);
    const actualCents = rows.reduce((sum, row) => sum + row.actualCents, 0);
    return {
      kind,
      plannedCents,
      actualCents,
      remainingCents: plannedCents - actualCents,
    };
  });

  const plannedTotalCents = kindSummaries
    .filter((row) => row.kind !== "income")
    .reduce((sum, row) => sum + row.plannedCents, 0);

  const actualOutCents = monthTransactions
    .filter((txn) => txn.direction === "out")
    .reduce((sum, txn) => sum + txn.amountCents, 0);

  const actualInCents = monthTransactions
    .filter((txn) => txn.direction === "in")
    .reduce((sum, txn) => sum + txn.amountCents, 0);

  return {
    monthStart,
    kindSummaries,
    categorySummaries,
    plannedTotalCents,
    actualOutCents,
    actualInCents,
    remainingOutCents: plannedTotalCents - actualOutCents,
  };
}
