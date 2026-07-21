import { formatCents } from "@/lib/domain/budget";
import type { CalendarOccurrence } from "@/lib/domain/calendar-event";
import {
  assertRangeWithinExpansionLimit,
  occurrenceIntersectsRange,
} from "@/lib/domain/calendar-event";
import {
  nextBillingDate,
  type Subscription,
  type SubscriptionCadence,
} from "@/lib/domain/subscription";

/**
 * Expand active subscription renewals across a visible calendar range.
 * Never persists — derived view only. Uses stored renewal_on as anchor and
 * advances with nextBillingDate (cadence + billing_day clamp).
 */
export function expandSubscriptionRenewalsInRange(
  subscriptions: Subscription[],
  rangeStart: string,
  rangeEnd: string,
): CalendarOccurrence[] {
  assertRangeWithinExpansionLimit(rangeStart, rangeEnd);

  const results: CalendarOccurrence[] = [];

  for (const sub of subscriptions) {
    if (sub.status !== "active" || !sub.renewalOn) {
      continue;
    }

    const occurrences = expandOneSubscriptionRenewal(sub, rangeStart, rangeEnd);
    results.push(...occurrences);
  }

  return results;
}

function expandOneSubscriptionRenewal(
  sub: Subscription,
  rangeStart: string,
  rangeEnd: string,
): CalendarOccurrence[] {
  const renewalOn = sub.renewalOn;
  if (!renewalOn) {
    return [];
  }

  const results: CalendarOccurrence[] = [];
  let cursor = renewalOn;
  let guard = 0;
  const maxIterations = 500;

  // Fast-forward until we reach or pass the range start.
  while (cursor < rangeStart && guard < maxIterations) {
    guard += 1;
    const next = nextBillingDate(cursor, sub.cadence, sub.billingDay);
    if (next <= cursor) {
      return [];
    }
    cursor = next;
  }

  guard = 0;
  while (cursor <= rangeEnd && guard < maxIterations) {
    guard += 1;
    if (occurrenceIntersectsRange(cursor, cursor, rangeStart, rangeEnd)) {
      results.push(toSubscriptionOccurrence(sub, cursor));
    }
    const next = nextBillingDate(cursor, sub.cadence, sub.billingDay);
    if (next <= cursor) {
      break;
    }
    cursor = next;
  }

  return results;
}

function toSubscriptionOccurrence(
  sub: Subscription,
  occDate: string,
): CalendarOccurrence {
  return {
    id: `sub:${sub.id}:${occDate}`,
    sourceKey: "subscription_renewals",
    seriesId: null,
    title: `${sub.vendor} · ${formatCents(sub.amountCents)}`,
    notes: "",
    location: "",
    category: null,
    allDay: true,
    startOn: occDate,
    endOn: occDate,
    startAt: null,
    endAt: null,
    recurrence: null,
    href: "/subscriptions",
    readonly: true,
  };
}

/** Cadences covered by expansion tests / docs. */
export const SUBSCRIPTION_RENEWAL_TEST_CADENCES: SubscriptionCadence[] = [
  "weekly",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "yearly",
];
