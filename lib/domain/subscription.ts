import { z } from "zod";

import { formatCents, nonNegativeCentsSchema } from "@/lib/domain/budget";
import { expectedUpdatedAtSchema } from "@/lib/domain/concurrency";
import {
  addDays,
  formatIsoDateLocal,
  formatIsoDateUs,
  formatRelativeDayPhrase,
  isoDateSchema,
  parseIsoDateLocal,
} from "@/lib/domain/dates";
import { toVersionTimestamp } from "@/lib/domain/timestamps";

export { formatCents };

/** Fixed billing cadences for V1 (no custom interval). */
export const subscriptionCadenceSchema = z.enum([
  "weekly",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "yearly",
]);

export type SubscriptionCadence = z.infer<typeof subscriptionCadenceSchema>;

export const SUBSCRIPTION_CADENCE_LABELS: Record<SubscriptionCadence, string> =
  {
    weekly: "Weekly",
    monthly: "Monthly",
    bimonthly: "Every 2 months",
    quarterly: "Quarterly",
    semiannual: "Every 6 months",
    yearly: "Yearly",
  };

/** Months to advance for month-based cadences. Weekly uses days instead. */
export const CADENCE_MONTHS: Record<
  Exclude<SubscriptionCadence, "weekly">,
  number
> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  yearly: 12,
};

export const subscriptionStatusSchema = z.enum(["active", "archived"]);

export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const billingDaySchema = z
  .number()
  .int()
  .min(1, "Billing day must be between 1 and 31.")
  .max(31, "Billing day must be between 1 and 31.");

export const subscriptionSchema = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  vendor: z.string().trim().min(1),
  categoryLabel: z.string(),
  amountCents: nonNegativeCentsSchema,
  cadence: subscriptionCadenceSchema,
  billingDay: billingDaySchema,
  renewalOn: isoDateSchema.nullable(),
  status: subscriptionStatusSchema,
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Subscription = z.infer<typeof subscriptionSchema>;

const vendorSchema = z
  .string()
  .trim()
  .min(1, "Vendor name is required.")
  .max(120, "Vendor name is too long.");

const categoryLabelSchema = z.string().trim().max(80, "Category is too long.");

const notesSchema = z.string().trim().max(500, "Notes are too long.");

/** Day-of-month (1–31) from a YYYY-MM-DD date. */
export function billingDayFromIso(isoDate: string): number {
  const date = parseIsoDateLocal(isoDate);
  return date.getDate();
}

const subscriptionWriteFieldsSchema = z.object({
  vendor: vendorSchema,
  categoryLabel: categoryLabelSchema.default(""),
  amountCents: nonNegativeCentsSchema,
  cadence: subscriptionCadenceSchema,
  renewalOn: isoDateSchema,
  notes: notesSchema.default(""),
});

/** Form/action input — billing day is derived from renewalOn. */
export const createSubscriptionInputSchema =
  subscriptionWriteFieldsSchema.transform((input) => ({
    ...input,
    billingDay: billingDayFromIso(input.renewalOn),
  }));

export type CreateSubscriptionInput = z.infer<
  typeof createSubscriptionInputSchema
>;

/** Repository re-validation after action parse (includes billingDay). */
export const createSubscriptionPersistedSchema =
  subscriptionWriteFieldsSchema.extend({
    billingDay: billingDaySchema,
  });

export const updateSubscriptionInputSchema = subscriptionWriteFieldsSchema
  .extend({
    id: z.uuid(),
    expectedUpdatedAt: expectedUpdatedAtSchema,
  })
  .transform((input) => ({
    ...input,
    billingDay: billingDayFromIso(input.renewalOn),
  }));

export type UpdateSubscriptionInput = z.infer<
  typeof updateSubscriptionInputSchema
>;

export const updateSubscriptionPersistedSchema =
  subscriptionWriteFieldsSchema.extend({
    id: z.uuid(),
    expectedUpdatedAt: expectedUpdatedAtSchema,
    billingDay: billingDaySchema,
  });

export const archiveSubscriptionInputSchema = z.object({
  id: z.uuid(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export type ArchiveSubscriptionInput = z.infer<
  typeof archiveSubscriptionInputSchema
>;

export type SubscriptionDueStatus =
  "overdue" | "dueToday" | "dueSoon" | "upcoming";

export const DUE_STATUS_LABELS: Record<SubscriptionDueStatus, string> = {
  overdue: "Overdue",
  dueToday: "Due today",
  dueSoon: "Due soon",
  upcoming: "Upcoming",
};

export type SubscriptionRow = {
  id: string;
  household_id: string;
  vendor: string;
  category_label: string;
  amount_cents: number;
  cadence: string;
  billing_day: number;
  renewal_on: string | null;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export function mapSubscription(row: SubscriptionRow): Subscription {
  return subscriptionSchema.parse({
    id: row.id,
    householdId: row.household_id,
    vendor: row.vendor,
    categoryLabel: row.category_label,
    amountCents: row.amount_cents,
    cadence: row.cadence,
    billingDay: row.billing_day,
    renewalOn: row.renewal_on,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: toVersionTimestamp(row.updated_at),
  });
}

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

/**
 * Advance a date by `months`, clamping to `billingDay` within the target month.
 * Preserves intended day-of-month across short months and leap years.
 */
export function addMonthsWithBillingDay(
  fromIso: string,
  months: number,
  billingDay: number,
): string {
  const from = parseIsoDateLocal(fromIso);
  const target = new Date(from.getFullYear(), from.getMonth() + months, 1);
  const year = target.getFullYear();
  const month = target.getMonth();
  const day = Math.min(billingDay, daysInMonth(year, month));
  return formatIsoDateLocal(new Date(year, month, day));
}

/**
 * Next billing date after `fromIso` for the given cadence.
 * Weekly advances 7 days; month-based cadences use billing_day clamping.
 */
export function nextBillingDate(
  fromIso: string,
  cadence: SubscriptionCadence,
  billingDay: number,
): string {
  billingDaySchema.parse(billingDay);
  if (cadence === "weekly") {
    return addDays(fromIso, 7);
  }
  return addMonthsWithBillingDay(fromIso, CADENCE_MONTHS[cadence], billingDay);
}

/**
 * Estimated monthly cost in integer cents.
 * Always show alongside the original amount — never replace it.
 */
export function monthlyEquivalentCents(
  amountCents: number,
  cadence: SubscriptionCadence,
): number {
  nonNegativeCentsSchema.parse(amountCents);
  switch (cadence) {
    case "weekly":
      return Math.round((amountCents * 52) / 12);
    case "monthly":
      return amountCents;
    case "bimonthly":
      return Math.round(amountCents / 2);
    case "quarterly":
      return Math.round(amountCents / 3);
    case "semiannual":
      return Math.round(amountCents / 6);
    case "yearly":
      return Math.round(amountCents / 12);
  }
}

/**
 * Estimated annual cost in integer cents (same cadence family as monthly).
 * weekly→×52, monthly→×12, bimonthly→×6, quarterly→×4, semiannual→×2, yearly→amount.
 */
export function yearlyEquivalentCents(
  amountCents: number,
  cadence: SubscriptionCadence,
): number {
  nonNegativeCentsSchema.parse(amountCents);
  switch (cadence) {
    case "weekly":
      return amountCents * 52;
    case "monthly":
      return amountCents * 12;
    case "bimonthly":
      return amountCents * 6;
    case "quarterly":
      return amountCents * 4;
    case "semiannual":
      return amountCents * 2;
    case "yearly":
      return amountCents;
  }
}

/**
 * Due urgency for an active subscription. Returns null when archived or
 * renewal date is missing.
 */
export function subscriptionDueStatus(input: {
  status: SubscriptionStatus;
  renewalOn: string | null;
  todayIso: string;
}): SubscriptionDueStatus | null {
  if (input.status !== "active" || !input.renewalOn) {
    return null;
  }
  isoDateSchema.parse(input.todayIso);
  isoDateSchema.parse(input.renewalOn);

  if (input.renewalOn < input.todayIso) {
    return "overdue";
  }
  if (input.renewalOn === input.todayIso) {
    return "dueToday";
  }

  const inSevenDays = addDays(input.todayIso, 7);
  if (input.renewalOn <= inSevenDays) {
    return "dueSoon";
  }
  return "upcoming";
}

/** Sum of monthly equivalents for active subscriptions only. */
export function activeMonthlyTotalCents(
  subscriptions: readonly Subscription[],
): number {
  let total = 0;
  for (const subscription of subscriptions) {
    if (subscription.status !== "active") {
      continue;
    }
    total += monthlyEquivalentCents(
      subscription.amountCents,
      subscription.cadence,
    );
  }
  return total;
}

/** Sum of yearly equivalents for active subscriptions only. */
export function activeYearlyTotalCents(
  subscriptions: readonly Subscription[],
): number {
  let total = 0;
  for (const subscription of subscriptions) {
    if (subscription.status !== "active") {
      continue;
    }
    total += yearlyEquivalentCents(
      subscription.amountCents,
      subscription.cadence,
    );
  }
  return total;
}

function compareByRenewalThenVendor(
  a: SubscriptionListItem,
  b: SubscriptionListItem,
): number {
  const aDate = a.renewalOn ?? "9999-12-31";
  const bDate = b.renewalOn ?? "9999-12-31";
  if (aDate !== bDate) {
    return aDate.localeCompare(bDate);
  }
  return a.vendor.localeCompare(b.vendor);
}

export function formatBillingAmount(
  amountCents: number,
  cadence: SubscriptionCadence,
): string {
  return `${formatCents(amountCents)} / ${SUBSCRIPTION_CADENCE_LABELS[cadence].toLowerCase()}`;
}

/**
 * Next billing caption: US date plus relative day phrase.
 * Example: "07-24-2026 (in 3 days)".
 */
export function formatNextBillingCaption(
  renewalOn: string,
  todayIso: string,
): string {
  isoDateSchema.parse(renewalOn);
  isoDateSchema.parse(todayIso);
  const usDate = formatIsoDateUs(renewalOn);
  const relative = formatRelativeDayPhrase(renewalOn, todayIso);
  return `${usDate} (${relative})`;
}

export function formatMonthlyEquivalent(amountCents: number): string {
  return `Monthly equivalent: ${formatCents(amountCents)}`;
}

export type SubscriptionListItem = Subscription & {
  monthlyCents: number;
  dueStatus: SubscriptionDueStatus | null;
  billingLabel: string;
  monthlyLabel: string;
  cadenceLabel: string;
};

export type SubscriptionsSummary = {
  activeCount: number;
  monthlyTotalCents: number;
  yearlyTotalCents: number;
};

/**
 * Page model: one active list (sorted by next billing, then vendor),
 * archived, and summary totals.
 */
export type SubscriptionsViewModel = {
  todayIso: string;
  active: SubscriptionListItem[];
  archived: SubscriptionListItem[];
  summary: SubscriptionsSummary;
};

function toListItem(
  subscription: Subscription,
  todayIso: string,
): SubscriptionListItem {
  const monthlyCents = monthlyEquivalentCents(
    subscription.amountCents,
    subscription.cadence,
  );
  return {
    ...subscription,
    monthlyCents,
    dueStatus: subscriptionDueStatus({
      status: subscription.status,
      renewalOn: subscription.renewalOn,
      todayIso,
    }),
    billingLabel: formatBillingAmount(
      subscription.amountCents,
      subscription.cadence,
    ),
    monthlyLabel: formatMonthlyEquivalent(monthlyCents),
    cadenceLabel: SUBSCRIPTION_CADENCE_LABELS[subscription.cadence],
  };
}

/**
 * Build page model: sorted active inventory, archived, and summary totals.
 * Due status remains on list items for domain/tests; UI does not group by it.
 */
export function buildSubscriptionsViewModel(
  subscriptions: readonly Subscription[],
  todayIso: string,
): SubscriptionsViewModel {
  isoDateSchema.parse(todayIso);

  const items = subscriptions.map((subscription) =>
    toListItem(subscription, todayIso),
  );

  const active = items
    .filter((item) => item.status === "active")
    .sort(compareByRenewalThenVendor);

  const archived = items
    .filter((item) => item.status === "archived")
    .sort((a, b) => a.vendor.localeCompare(b.vendor));

  return {
    todayIso,
    active,
    archived,
    summary: {
      activeCount: active.length,
      monthlyTotalCents: activeMonthlyTotalCents(subscriptions),
      yearlyTotalCents: activeYearlyTotalCents(subscriptions),
    },
  };
}
