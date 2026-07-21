import type { CalendarOccurrence } from "@/lib/domain/calendar-event";

/**
 * Budget V1 has no reliable future payment-reminder source.
 * Reserved for a later due-date entity — returns no occurrences.
 */
export function listPaymentReminderOccurrences(_args: {
  rangeStart: string;
  rangeEnd: string;
}): CalendarOccurrence[] {
  void _args;
  return [];
}
