import { describe, expect, it } from "vitest";

import {
  buildBudgetMonthSnapshot,
  currentMonthStart,
  directionForKind,
  formatCents,
  formatMonthLabel,
  monthEndFor,
  monthStartFor,
  parseDollarInputToCents,
  parseDollarInputToNonNegativeCents,
  shiftMonthStart,
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

describe("buildBudgetMonthSnapshot", () => {
  const categories: BudgetCategory[] = [
    {
      id: "11111111-1111-4111-8111-111111111101",
      householdId: "11111111-1111-4111-8111-111111111111",
      name: "Paycheck",
      kind: "income",
      sortOrder: 0,
      archivedAt: null,
    },
    {
      id: "11111111-1111-4111-8111-111111111102",
      householdId: "11111111-1111-4111-8111-111111111111",
      name: "Groceries",
      kind: "expense",
      sortOrder: 0,
      archivedAt: null,
    },
    {
      id: "11111111-1111-4111-8111-111111111103",
      householdId: "11111111-1111-4111-8111-111111111111",
      name: "Rent",
      kind: "bill",
      sortOrder: 0,
      archivedAt: null,
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
});
