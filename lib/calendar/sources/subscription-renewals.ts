import { expandSubscriptionRenewalsInRange } from "@/lib/domain/calendar-subscription-renewals";
import type { CalendarOccurrence } from "@/lib/domain/calendar-event";
import type { Subscription } from "@/lib/domain/subscription";

export function listSubscriptionRenewalOccurrences(args: {
  subscriptions: Subscription[];
  rangeStart: string;
  rangeEnd: string;
}): CalendarOccurrence[] {
  return expandSubscriptionRenewalsInRange(
    args.subscriptions,
    args.rangeStart,
    args.rangeEnd,
  );
}
