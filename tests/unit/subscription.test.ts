import { describe, expect, it } from "vitest";

import { addDays } from "@/lib/domain/dates";
import {
  activeMonthlyTotalCents,
  activeYearlyTotalCents,
  addMonthsWithBillingDay,
  billingDayFromIso,
  buildSubscriptionsViewModel,
  createSubscriptionInputSchema,
  monthlyEquivalentCents,
  nextBillingDate,
  subscriptionDueStatus,
  yearlyEquivalentCents,
  type Subscription,
  type SubscriptionCadence,
} from "@/lib/domain/subscription";

function makeSubscription(
  overrides: Partial<Subscription> &
    Pick<Subscription, "id" | "vendor" | "amountCents" | "cadence">,
): Subscription {
  return {
    householdId: "11111111-1111-4111-8111-111111111111",
    categoryLabel: "",
    billingDay: 1,
    renewalOn: "2026-07-15",
    status: "active",
    notes: "",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("monthlyEquivalentCents", () => {
  const cases: Array<[SubscriptionCadence, number, number]> = [
    ["weekly", 1000, Math.round((1000 * 52) / 12)],
    ["monthly", 1599, 1599],
    ["bimonthly", 2000, 1000],
    ["quarterly", 3000, 1000],
    ["semiannual", 6000, 1000],
    ["yearly", 72000, 6000],
  ];

  it.each(cases)("%s: %i cents → %i monthly", (cadence, amount, expected) => {
    expect(monthlyEquivalentCents(amount, cadence)).toBe(expected);
  });
});

describe("yearlyEquivalentCents", () => {
  const cases: Array<[SubscriptionCadence, number, number]> = [
    ["weekly", 1000, 52_000],
    ["monthly", 1599, 1599 * 12],
    ["bimonthly", 2000, 12_000],
    ["quarterly", 3000, 12_000],
    ["semiannual", 6000, 12_000],
    ["yearly", 72000, 72_000],
  ];

  it.each(cases)("%s: %i cents → %i yearly", (cadence, amount, expected) => {
    expect(yearlyEquivalentCents(amount, cadence)).toBe(expected);
  });
});

describe("nextBillingDate", () => {
  it("advances weekly by seven days", () => {
    expect(nextBillingDate("2026-07-20", "weekly", 20)).toBe("2026-07-27");
  });

  it("advances monthly by one month", () => {
    expect(nextBillingDate("2026-01-15", "monthly", 15)).toBe("2026-02-15");
  });

  it("advances bimonthly by two months", () => {
    expect(nextBillingDate("2026-01-10", "bimonthly", 10)).toBe("2026-03-10");
  });

  it("advances quarterly by three months", () => {
    expect(nextBillingDate("2026-01-10", "quarterly", 10)).toBe("2026-04-10");
  });

  it("advances semiannual by six months", () => {
    expect(nextBillingDate("2026-01-10", "semiannual", 10)).toBe("2026-07-10");
  });

  it("advances yearly by twelve months", () => {
    expect(nextBillingDate("2026-03-05", "yearly", 5)).toBe("2027-03-05");
  });

  it("clamps Jan 31 to Feb 28 in a non-leap year", () => {
    expect(nextBillingDate("2026-01-31", "monthly", 31)).toBe("2026-02-28");
  });

  it("clamps Jan 31 to Feb 29 in a leap year", () => {
    expect(nextBillingDate("2024-01-31", "monthly", 31)).toBe("2024-02-29");
  });

  it("restores billing day 31 after a short February", () => {
    expect(nextBillingDate("2026-02-28", "monthly", 31)).toBe("2026-03-31");
  });

  it("clamps day 30 in February", () => {
    expect(addMonthsWithBillingDay("2026-01-30", 1, 30)).toBe("2026-02-28");
  });

  it("preserves day 29 across leap February into March", () => {
    expect(nextBillingDate("2024-02-29", "monthly", 29)).toBe("2024-03-29");
  });

  it("crosses year boundary", () => {
    expect(nextBillingDate("2026-12-15", "monthly", 15)).toBe("2027-01-15");
  });
});

describe("billingDayFromIso", () => {
  it("extracts the day component", () => {
    expect(billingDayFromIso("2026-07-31")).toBe(31);
  });
});

describe("subscriptionDueStatus", () => {
  const today = "2026-07-20";

  it("returns overdue before today", () => {
    expect(
      subscriptionDueStatus({
        status: "active",
        renewalOn: "2026-07-19",
        todayIso: today,
      }),
    ).toBe("overdue");
  });

  it("returns dueToday on today", () => {
    expect(
      subscriptionDueStatus({
        status: "active",
        renewalOn: today,
        todayIso: today,
      }),
    ).toBe("dueToday");
  });

  it("returns dueSoon within 1–7 days", () => {
    expect(
      subscriptionDueStatus({
        status: "active",
        renewalOn: addDays(today, 1),
        todayIso: today,
      }),
    ).toBe("dueSoon");
    expect(
      subscriptionDueStatus({
        status: "active",
        renewalOn: addDays(today, 7),
        todayIso: today,
      }),
    ).toBe("dueSoon");
  });

  it("returns upcoming beyond 7 days", () => {
    expect(
      subscriptionDueStatus({
        status: "active",
        renewalOn: addDays(today, 8),
        todayIso: today,
      }),
    ).toBe("upcoming");
  });

  it("returns null for archived or missing renewal", () => {
    expect(
      subscriptionDueStatus({
        status: "archived",
        renewalOn: today,
        todayIso: today,
      }),
    ).toBeNull();
    expect(
      subscriptionDueStatus({
        status: "active",
        renewalOn: null,
        todayIso: today,
      }),
    ).toBeNull();
  });
});

describe("active totals and view model", () => {
  it("sums only active subscriptions for monthly and yearly", () => {
    const subscriptions = [
      makeSubscription({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        vendor: "Netflix",
        amountCents: 1599,
        cadence: "monthly",
      }),
      makeSubscription({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        vendor: "Insurance",
        amountCents: 72000,
        cadence: "yearly",
        status: "archived",
      }),
    ];
    expect(activeMonthlyTotalCents(subscriptions)).toBe(1599);
    expect(activeYearlyTotalCents(subscriptions)).toBe(1599 * 12);
  });

  it("sorts active by renewal then vendor, excludes archived", () => {
    const today = "2026-07-20";
    const subscriptions = [
      makeSubscription({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        vendor: "Zebra",
        amountCents: 1000,
        cadence: "monthly",
        renewalOn: addDays(today, 20),
        billingDay: 9,
      }),
      makeSubscription({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        vendor: "Soon",
        amountCents: 2000,
        cadence: "monthly",
        renewalOn: addDays(today, 3),
        billingDay: 23,
      }),
      makeSubscription({
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        vendor: "Overdue",
        amountCents: 3000,
        cadence: "monthly",
        renewalOn: addDays(today, -2),
        billingDay: 18,
      }),
      makeSubscription({
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        vendor: "Alpha",
        amountCents: 1500,
        cadence: "monthly",
        renewalOn: addDays(today, 3),
        billingDay: 23,
      }),
      makeSubscription({
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        vendor: "Old",
        amountCents: 9999,
        cadence: "monthly",
        status: "archived",
        renewalOn: today,
      }),
    ];

    const vm = buildSubscriptionsViewModel(subscriptions, today);
    expect(vm.summary.activeCount).toBe(4);
    expect(vm.summary.monthlyTotalCents).toBe(7500);
    expect(vm.summary.yearlyTotalCents).toBe(7500 * 12);
    expect(vm.active.map((item) => item.vendor)).toEqual([
      "Overdue",
      "Alpha",
      "Soon",
      "Zebra",
    ]);
    expect(vm.archived).toHaveLength(1);
    expect(vm.active[0]?.billingLabel).toContain("$30.00");
    expect(vm.active[0]?.billingLabel).toContain("monthly");
  });
});

describe("createSubscriptionInputSchema", () => {
  it("derives billingDay from renewalOn", () => {
    const parsed = createSubscriptionInputSchema.parse({
      vendor: "Spotify",
      amountCents: 1099,
      cadence: "monthly",
      renewalOn: "2026-07-31",
    });
    expect(parsed.billingDay).toBe(31);
    expect(parsed.categoryLabel).toBe("");
  });

  it("rejects empty vendor", () => {
    const result = createSubscriptionInputSchema.safeParse({
      vendor: "  ",
      amountCents: 100,
      cadence: "monthly",
      renewalOn: "2026-07-20",
    });
    expect(result.success).toBe(false);
  });
});
