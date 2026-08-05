import type { BudgetCategoryKind } from "@/lib/domain/budget";

/** First row of each 56-row recipe band on Recipe Management. */
export const RECIPE_BAND_START_ROWS = [
  5, 61, 117, 173, 229, 285, 341, 397, 453,
] as const;

/** Recipe block anchor columns (1-based): B, K, T. */
export const RECIPE_BLOCK_COLUMNS = [2, 11, 20] as const;

export const RECIPE_BLOCK_OFFSET = {
  prepTimeLabel: 10,
  servingsLabel: 11,
  cookTimeLabel: 12,
  sourceUrl: 14,
  ingredientStart: 16,
  ingredientEnd: 45,
  totalRow: 46,
  notesLabel: 47,
  metadataValueColOffset: 5,
} as const;

export const SETUP_INGREDIENT_START_ROW = 10;
export const SETUP_INGREDIENT_END_ROW = 1002;

export const SUBSCRIPTION_DATA_START_ROW = 11;

export const PLACEHOLDER_RECIPE = /^Recipe\s+\d+$/i;
export const PLACEHOLDER_TITLE = /^(ENTER HERE|ENETER HERE|Garlic Powder$)/i;

export const WORKBOOK_CADENCE_TO_DOMAIN: Record<string, string> = {
  weekly: "weekly",
  monthly: "monthly",
  bimonthly: "bimonthly",
  quarterly: "quarterly",
  semiannual: "semiannual",
  yearly: "yearly",
};

/** Workbook Log/Monthly Budget kind label → Postgres kind. */
export const WORKBOOK_KIND_TO_DOMAIN: Record<string, BudgetCategoryKind> = {
  Income: "income",
  Bills: "bill",
  Expenses: "expense",
  Savings: "savings",
  Debt: "debt",
};

export const BACKEND_CATEGORY_COLUMNS: Array<{
  col: number;
  kind: BudgetCategoryKind;
}> = [
  { col: 2, kind: "income" },
  { col: 3, kind: "bill" },
  { col: 4, kind: "expense" },
  { col: 5, kind: "savings" },
  { col: 6, kind: "debt" },
];

export const BUDGET_TRACKER_SECTIONS = [
  { kind: "bill" as const, nameCol: 10, limitCol: 12 },
  { kind: "expense" as const, nameCol: 16, limitCol: 18 },
  { kind: "savings" as const, nameCol: 23, limitCol: 24 },
  { kind: "debt" as const, nameCol: 30, limitCol: 31 },
] as const;

export const LOG_DATA_START_ROW = 4;
export const LOG_DATA_END_ROW = 3001;

export const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  JANUARY: 1,
  FEBRUARY: 2,
  MARCH: 3,
  APRIL: 4,
  MAY: 5,
  JUNE: 6,
  JULY: 7,
  AUGUST: 8,
  SEPTEMBER: 9,
  OCTOBER: 10,
  NOVEMBER: 11,
  DECEMBER: 12,
};
