import type {
  CalendarOccurrence,
  CalendarSourceKey,
} from "@/lib/domain/calendar-event";
import type { CalendarSourcePreferences } from "@/lib/domain/calendar-event";
import { expandHouseholdEventsInRange } from "@/lib/calendar/sources/household-events";
import { listPaymentReminderOccurrences } from "@/lib/calendar/sources/payment-reminders";
import { listSubscriptionRenewalOccurrences } from "@/lib/calendar/sources/subscription-renewals";
import type { CalendarEvent } from "@/lib/domain/calendar-event";
import type { Subscription } from "@/lib/domain/subscription";

export function composeCalendarOccurrences(args: {
  events: CalendarEvent[];
  subscriptions: Subscription[];
  preferences: CalendarSourcePreferences;
  rangeStart: string;
  rangeEnd: string;
}): CalendarOccurrence[] {
  const results: CalendarOccurrence[] = [];

  if (args.preferences.household_events) {
    results.push(
      ...expandHouseholdEventsInRange(
        args.events,
        args.rangeStart,
        args.rangeEnd,
      ),
    );
  }

  if (args.preferences.subscription_renewals) {
    results.push(
      ...listSubscriptionRenewalOccurrences({
        subscriptions: args.subscriptions,
        rangeStart: args.rangeStart,
        rangeEnd: args.rangeEnd,
      }),
    );
  }

  if (args.preferences.payment_reminders) {
    results.push(
      ...listPaymentReminderOccurrences({
        rangeStart: args.rangeStart,
        rangeEnd: args.rangeEnd,
      }),
    );
  }

  return results;
}

export type { CalendarSourceKey };
