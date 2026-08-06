import { describe, expect, it } from "vitest";

import {
  buildBudgetMonthSnapshot,
  buildBudgetYearSnapshot,
  currentMonthStart,
  DEFAULT_BUDGET_CATEGORIES,
  defaultOccurredOnForMonth,
  directionForKind,
  formatCents,
  formatMonthLabel,
  resolveBudgetPeriod,
  monthEndFor,
  monthStartFor,
  parseDollarInputToCents,
  parseDollarInputToNonNegativeCents,
  shiftMonthStart,
  transactionAmountTone,
  type BudgetCategory,
  type BudgetMonthLimit,
  type Transaction,
} from "@/lib/domain/budget";

describe("parseDollarInputToCents", () => {
  it("parses whole dollars", () => {
    expect(parseDollarInputToCents("12")).toBe(1200);
  });

  it("parses dollars with cents and currency symbols", () => {
    expect(parseDollarInputToCents("$12.50")).toBe(1250);
    expect(parseDollarInputToCents("1,234.5")).toBe(123450);
  });

  it("rejects zero, negative, empty, and invalid input", () => {
    expect(() => parseDollarInputToCents("0")).toThrow(/greater than zero/i);
    expect(() => parseDollarInputToCents("-1")).toThrow(/greater than zero/i);
    expect(() => parseDollarInputToCents("")).toThrow(/enter an amount/i);
    expect(() => parseDollarInputToCents("12.345")).toThrow(/valid dollar/i);
  });
});

describe("parseDollarInputToNonNegativeCents", () => {
  it("allows zero for planned limits", () => {
    expect(parseDollarInputToNonNegativeCents("0")).toBe(0);
    expect(parseDollarInputToNonNegativeCents("10.00")).toBe(1000);
    expect(() => parseDollarInputToNonNegativeCents("-1")).toThrow();
  });
});

describe("formatCents", () => {
  it("formats positive cents as USD", () => {
    expect(formatCents(1250)).toBe("$12.50");
    expect(formatCents(0)).toBe("$0.00");
  });

  it("supports signed display", () => {
    expect(formatCents(500, { signed: true })).toBe("+$5.00");
    expect(formatCents(-500, { signed: true })).toBe("-$5.00");
  });
});

describe("month boundaries", () => {
  it("normalizes any day to month start", () => {
    expect(monthStartFor("2026-07-16")).toBe("2026-07-01");
  });

  it("computes inclusive month end", () => {
    expect(monthEndFor("2026-07-01")).toBe("2026-07-31");
    expect(monthEndFor("2026-02-01")).toBe("2026-02-28");
  });

  it("shifts months across year boundaries", () => {
    expect(shiftMonthStart("2026-01-01", -1)).toBe("2025-12-01");
    expect(shiftMonthStart("2026-12-01", 1)).toBe("2027-01-01");
  });

  it("formats a month label", () => {
    expect(formatMonthLabel("2026-07-01")).toMatch(/July 2026/);
  });

  it("currentMonthStart matches todayIso month", () => {
    const fixed = new Date(2026, 6, 16);
    expect(currentMonthStart(fixed)).toBe("2026-07-01");
  });

  it("defaults add-transaction date within the viewed month", () => {
    expect(defaultOccurredOnForMonth("2026-07-01", "2026-07-16")).toBe(
      "2026-07-16",
    );
    expect(defaultOccurredOnForMonth("2026-06-01", "2026-07-16")).toBe(
      "2026-06-30",
    );
    expect(defaultOccurredOnForMonth("2026-08-01", "2026-07-16")).toBe(
      "2026-08-01",
    );
  });
});

describe("Budget period URLs", () => {
  it("canonicalizes month and drops year", () => {
    expect(
      resolveBudgetPeriod({ view: "month", month: "2026-07", year: "2025" }),
    ).toMatchObject({
      view: "month",
      monthStart: "2026-07-01",
      canonicalQuery: "view=month&month=2026-07",
    });
  });

  it("canonicalizes year and drops month", () => {
    expect(
      resolveBudgetPeriod({ view: "year", year: "2026", month: "2025-01" }),
    ).toEqual({
      view: "year",
      year: 2026,
      canonicalQuery: "view=year&year=2026",
    });
  });
});

describe("DEFAULT_BUDGET_CATEGORIES", () => {
  it("includes Food, Gas, Bills, and Fun", () => {
    expect(DEFAULT_BUDGET_CATEGORIES.map((category) => category.name)).toEqual([
      "Food",
      "Gas",
      "Bills",
      "Fun",
    ]);
  });

  it("maps Bills to the bill kind and the rest to expense", () => {
    expect(DEFAULT_BUDGET_CATEGORIES).toEqual([
      { name: "Food", kind: "expense" },
      { name: "Gas", kind: "expense" },
      { name: "Bills", kind: "bill" },
      { name: "Fun", kind: "expense" },
    ]);
  });
});

describe("directionForKind", () => {
  it("maps income to in and all other kinds to out", () => {
    expect(directionForKind("income")).toBe("in");
    expect(directionForKind("expense")).toBe("out");
    expect(directionForKind("bill")).toBe("out");
    expect(directionForKind("savings")).toBe("out");
    expect(directionForKind("debt")).toBe("out");
  });
});

describe("transactionAmountTone", () => {
  it("colors income as green and everyday spending as red", () => {
    expect(transactionAmountTone("income", "in")).toBe("income");
    expect(transactionAmountTone("expense", "out")).toBe("spending");
    expect(transactionAmountTone("bill", "out")).toBe("spending");
  });

  it("keeps savings and debt transfers neutral", () => {
    expect(transactionAmountTone("savings", "out")).toBe("neutral");
    expect(transactionAmountTone("debt", "out")).toBe("neutral");
  });

  it("falls back safely when category kind is unknown", () => {
    expect(transactionAmountTone(undefined, "in")).toBe("income");
    expect(transactionAmountTone(undefined, "out")).toBe("neutral");
  });
});

describe("buildBudgetMonthSnapshot", () => {
  const categories: BudgetCategory[] = [
    {
      id: "11111111-1111-4111-8111-111111111101",
      householdId: "11111111-1111-4111-8111-111111111111",
      name: "Paycheck",
      kind: "income",
      sortOrder: 0,
      archivedAt: null,
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
    {
      id: "11111111-1111-4111-8111-111111111102",
      householdId: "11111111-1111-4111-8111-111111111111",
      name: "Groceries",
      kind: "expense",
      sortOrder: 0,
      archivedAt: null,
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
    {
      id: "11111111-1111-4111-8111-111111111103",
      householdId: "11111111-1111-4111-8111-111111111111",
      name: "Rent",
      kind: "bill",
      sortOrder: 0,
      archivedAt: null,
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
  ];

  const limits: BudgetMonthLimit[] = [
    {
      id: "21111111-1111-4111-8111-111111111101",
      householdId: "11111111-1111-4111-8111-111111111111",
      categoryId: "11111111-1111-4111-8111-111111111101",
      monthStart: "2026-07-01",
      limitCents: 400000,
    },
    {
      id: "21111111-1111-4111-8111-111111111102",
      householdId: "11111111-1111-4111-8111-111111111111",
      categoryId: "11111111-1111-4111-8111-111111111102",
      monthStart: "2026-07-01",
      limitCents: 50000,
    },
    {
      id: "21111111-1111-4111-8111-111111111103",
      householdId: "11111111-1111-4111-8111-111111111111",
      categoryId: "11111111-1111-4111-8111-111111111103",
      monthStart: "2026-07-01",
      limitCents: 150000,
    },
  ];

  const transactions: Transaction[] = [
    {
      id: "31111111-1111-4111-8111-111111111101",
      householdId: "11111111-1111-4111-8111-111111111111",
      categoryId: "11111111-1111-4111-8111-111111111101",
      amountCents: 400000,
      direction: "in",
      occurredOn: "2026-07-02",
      payee: "",
      notes: "",
      updatedAt: "2026-07-02T00:00:00.000Z",
    },
    {
      id: "31111111-1111-4111-8111-111111111102",
      householdId: "11111111-1111-4111-8111-111111111111",
      categoryId: "11111111-1111-4111-8111-111111111102",
      amountCents: 1250,
      direction: "out",
      occurredOn: "2026-07-03",
      payee: "Store",
      notes: "",
      updatedAt: "2026-07-03T00:00:00.000Z",
    },
    {
      id: "31111111-1111-4111-8111-111111111103",
      householdId: "11111111-1111-4111-8111-111111111111",
      categoryId: "11111111-1111-4111-8111-111111111102",
      amountCents: 60000,
      direction: "out",
      occurredOn: "2026-07-10",
      payee: "Overspend",
      notes: "",
      updatedAt: "2026-07-10T00:00:00.000Z",
    },
  ];

  it("builds kind and category summaries with derived remaining", () => {
    const snapshot = buildBudgetMonthSnapshot({
      monthStart: "2026-07-15",
      categories,
      limits,
      transactions,
    });

    expect(snapshot.monthStart).toBe("2026-07-01");

    const groceries = snapshot.categorySummaries.find(
      (row) => row.name === "Groceries",
    );
    expect(groceries).toMatchObject({
      plannedCents: 50000,
      actualCents: 61250,
      remainingCents: -11250,
    });

    const expenseKind = snapshot.kindSummaries.find(
      (row) => row.kind === "expense",
    );
    expect(expenseKind).toMatchObject({
      plannedCents: 50000,
      actualCents: 61250,
      remainingCents: -11250,
    });

    const incomeKind = snapshot.kindSummaries.find(
      (row) => row.kind === "income",
    );
    expect(incomeKind).toMatchObject({
      plannedCents: 400000,
      actualCents: 400000,
      remainingCents: 0,
    });

    expect(snapshot.plannedTotalCents).toBe(200000);
    expect(snapshot.actualOutCents).toBe(61250);
    expect(snapshot.actualInCents).toBe(400000);
    expect(snapshot.remainingOutCents).toBe(138750);
  });

  it("handles zero and empty states", () => {
    const empty = buildBudgetMonthSnapshot({
      monthStart: "2026-08-01",
      categories: [],
      limits: [],
      transactions: [],
    });

    expect(empty.categorySummaries).toEqual([]);
    expect(empty.plannedTotalCents).toBe(0);
    expect(empty.actualOutCents).toBe(0);
    expect(empty.actualInCents).toBe(0);
    expect(empty.remainingOutCents).toBe(0);
    expect(empty.kindSummaries.every((row) => row.actualCents === 0)).toBe(
      true,
    );
  });

  it("ignores transactions outside the month", () => {
    const snapshot = buildBudgetMonthSnapshot({
      monthStart: "2026-07-01",
      categories,
      limits,
      transactions: [
        {
          ...transactions[1]!,
          occurredOn: "2026-06-30",
        },
      ],
    });

    const groceries = snapshot.categorySummaries.find(
      (row) => row.name === "Groceries",
    );
    expect(groceries?.actualCents).toBe(0);
    expect(groceries?.remainingCents).toBe(50000);
  });

  it("ignores category actuals when direction disagrees with kind", () => {
    const snapshot = buildBudgetMonthSnapshot({
      monthStart: "2026-07-01",
      categories,
      limits,
      transactions: [
        {
          ...transactions[1]!,
          direction: "in",
        },
      ],
    });

    const groceries = snapshot.categorySummaries.find(
      (row) => row.name === "Groceries",
    );
    expect(groceries?.actualCents).toBe(0);
    expect(snapshot.actualInCents).toBe(1250);
    expect(snapshot.actualOutCents).toBe(0);
  });

  it("aggregates actual yearly flows without multiplying limits", () => {
    const savings: BudgetCategory = {
      ...categories[1]!,
      id: "11111111-1111-4111-8111-111111111104",
      name: "Emergency fund",
      kind: "savings",
    };
    const snapshot = buildBudgetYearSnapshot({
      year: 2026,
      categories: [...categories, savings],
      transactions: [
        ...transactions,
        {
          ...transactions[1]!,
          id: "41111111-1111-4111-8111-111111111101",
          categoryId: savings.id,
          amountCents: 5000,
          occurredOn: "2026-12-31",
        },
        {
          ...transactions[1]!,
          id: "41111111-1111-4111-8111-111111111102",
          amountCents: 999999,
          occurredOn: "2025-12-31",
        },
      ],
    });
    expect(snapshot.spendingCents).toBe(61250);
    expect(snapshot.incomeCents).toBe(400000);
    expect(snapshot.savingsCents).toBe(5000);
    expect(snapshot.debtCents).toBe(0);
  });
});
