import { describe, expect, it } from "vitest";

import {
  createCalendarEventInputSchema,
  expandCalendarEventInRange,
  formatOccurrenceTimeLabel,
  groupOccurrencesByDate,
  nextRecurrenceStart,
  sortCalendarOccurrences,
  type CalendarEvent,
  type CalendarOccurrence,
} from "@/lib/domain/calendar-event";
import { expandSubscriptionRenewalsInRange } from "@/lib/domain/calendar-subscription-renewals";
import { listPaymentReminderOccurrences } from "@/lib/calendar/sources/payment-reminders";
import type { Subscription } from "@/lib/domain/subscription";

function baseEvent(
  overrides: Partial<CalendarEvent> &
    Pick<CalendarEvent, "startOn" | "endOn" | "recurrence">,
): CalendarEvent {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    householdId: "22222222-2222-4222-8222-222222222222",
    title: "Test",
    notes: "",
    location: "",
    category: "other",
    allDay: true,
    startAt: null,
    endAt: null,
    recurrenceEndOn: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function baseSub(
  overrides: Partial<Subscription> &
    Pick<Subscription, "renewalOn" | "cadence" | "billingDay" | "status">,
): Subscription {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    householdId: "22222222-2222-4222-8222-222222222222",
    vendor: "Netflix",
    categoryLabel: "Streaming",
    amountCents: 1599,
    notes: "",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("calendar event timed validation", () => {
  it("accepts same-day timed events", () => {
    const parsed = createCalendarEventInputSchema.parse({
      title: "Dentist",
      allDay: false,
      startOn: "2026-07-14",
      endOn: "2026-07-14",
      startAt: "14:00",
      endAt: "15:00",
      recurrence: "none",
    });
    expect(parsed.startAt).toBe("14:00:00");
    expect(parsed.endAt).toBe("15:00:00");
  });

  it("accepts overnight timed events", () => {
    const parsed = createCalendarEventInputSchema.parse({
      title: "Night",
      allDay: false,
      startOn: "2026-07-14",
      endOn: "2026-07-15",
      startAt: "22:00",
      endAt: "01:00",
      recurrence: "none",
    });
    expect(parsed.endOn).toBe("2026-07-15");
    expect(parsed.endAt).toBe("01:00:00");
  });

  it("accepts multi-day timed events", () => {
    const parsed = createCalendarEventInputSchema.parse({
      title: "Trip",
      category: "trip",
      allDay: false,
      startOn: "2026-07-17",
      endOn: "2026-07-19",
      startAt: "09:00",
      endAt: "17:00",
      recurrence: "none",
    });
    expect(parsed.endOn).toBe("2026-07-19");
  });

  it("rejects same-day timed when end_at <= start_at", () => {
    expect(() =>
      createCalendarEventInputSchema.parse({
        title: "Bad",
        allDay: false,
        startOn: "2026-07-14",
        endOn: "2026-07-14",
        startAt: "15:00",
        endAt: "14:00",
        recurrence: "none",
      }),
    ).toThrow();
  });
});

describe("calendar recurrence expansion", () => {
  it("expands daily within a week", () => {
    const event = baseEvent({
      startOn: "2026-07-12",
      endOn: "2026-07-12",
      recurrence: "daily",
    });
    const occ = expandCalendarEventInRange(event, "2026-07-12", "2026-07-18");
    expect(occ.map((o) => o.startOn)).toEqual([
      "2026-07-12",
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
    ]);
  });

  it("expands weekly on the same weekday", () => {
    const event = baseEvent({
      title: "Trash",
      category: "household",
      startOn: "2026-07-07", // Tuesday
      endOn: "2026-07-07",
      recurrence: "weekly",
    });
    const occ = expandCalendarEventInRange(event, "2026-07-01", "2026-07-31");
    expect(occ.map((o) => o.startOn)).toEqual([
      "2026-07-07",
      "2026-07-14",
      "2026-07-21",
      "2026-07-28",
    ]);
  });

  it("expands every two weeks", () => {
    const event = baseEvent({
      startOn: "2026-07-01",
      endOn: "2026-07-01",
      recurrence: "every_two_weeks",
    });
    const occ = expandCalendarEventInRange(event, "2026-07-01", "2026-07-31");
    expect(occ.map((o) => o.startOn)).toEqual([
      "2026-07-01",
      "2026-07-15",
      "2026-07-29",
    ]);
  });

  it("clamps monthly 31st into shorter months", () => {
    expect(nextRecurrenceStart("2026-01-31", "monthly", 31)).toBe("2026-02-28");
    expect(nextRecurrenceStart("2026-02-28", "monthly", 31)).toBe("2026-03-31");
  });

  it("clamps yearly Feb 29 to Feb 28 in non-leap years", () => {
    expect(nextRecurrenceStart("2024-02-29", "yearly", 29)).toBe("2025-02-28");
    expect(nextRecurrenceStart("2025-02-28", "yearly", 29)).toBe("2026-02-28");
    expect(nextRecurrenceStart("2027-02-28", "yearly", 29)).toBe("2028-02-29");
  });

  it("respects recurrence_end_on inclusively", () => {
    const event = baseEvent({
      startOn: "2026-07-01",
      endOn: "2026-07-01",
      recurrence: "weekly",
      recurrenceEndOn: "2026-07-15",
    });
    const occ = expandCalendarEventInRange(event, "2026-07-01", "2026-07-31");
    expect(occ.map((o) => o.startOn)).toEqual([
      "2026-07-01",
      "2026-07-08",
      "2026-07-15",
    ]);
  });

  it("includes multi-day spill into the range", () => {
    const event = baseEvent({
      startOn: "2026-06-30",
      endOn: "2026-07-02",
      recurrence: "none",
    });
    const occ = expandCalendarEventInRange(event, "2026-07-01", "2026-07-07");
    expect(occ).toHaveLength(1);
    expect(occ[0]?.startOn).toBe("2026-06-30");
  });
});

describe("subscription renewal expansion", () => {
  it("expands weekly renewals", () => {
    const occ = expandSubscriptionRenewalsInRange(
      [
        baseSub({
          renewalOn: "2026-07-07",
          cadence: "weekly",
          billingDay: 7,
          status: "active",
        }),
      ],
      "2026-07-01",
      "2026-07-31",
    );
    expect(occ.map((o) => o.startOn)).toEqual([
      "2026-07-07",
      "2026-07-14",
      "2026-07-21",
      "2026-07-28",
    ]);
    expect(occ[0]?.href).toBe("/subscriptions");
    expect(occ[0]?.readonly).toBe(true);
  });

  it("expands monthly with 31st clamp", () => {
    const occ = expandSubscriptionRenewalsInRange(
      [
        baseSub({
          renewalOn: "2026-01-31",
          cadence: "monthly",
          billingDay: 31,
          status: "active",
        }),
      ],
      "2026-01-01",
      "2026-04-30",
    );
    expect(occ.map((o) => o.startOn)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("expands bimonthly, quarterly, semiannual, yearly across year boundary", () => {
    const bimonthly = expandSubscriptionRenewalsInRange(
      [
        baseSub({
          renewalOn: "2026-11-15",
          cadence: "bimonthly",
          billingDay: 15,
          status: "active",
        }),
      ],
      "2026-11-01",
      "2027-03-31",
    );
    expect(bimonthly.map((o) => o.startOn)).toEqual([
      "2026-11-15",
      "2027-01-15",
      "2027-03-15",
    ]);

    const quarterly = expandSubscriptionRenewalsInRange(
      [
        baseSub({
          id: "44444444-4444-4444-8444-444444444444",
          renewalOn: "2026-10-01",
          cadence: "quarterly",
          billingDay: 1,
          status: "active",
        }),
      ],
      "2026-10-01",
      "2027-04-01",
    );
    expect(quarterly.map((o) => o.startOn)).toEqual([
      "2026-10-01",
      "2027-01-01",
      "2027-04-01",
    ]);

    const semi = expandSubscriptionRenewalsInRange(
      [
        baseSub({
          id: "55555555-5555-4555-8555-555555555555",
          renewalOn: "2026-06-01",
          cadence: "semiannual",
          billingDay: 1,
          status: "active",
        }),
      ],
      "2026-06-01",
      "2027-06-01",
    );
    expect(semi.map((o) => o.startOn)).toEqual([
      "2026-06-01",
      "2026-12-01",
      "2027-06-01",
    ]);

    const yearly = expandSubscriptionRenewalsInRange(
      [
        baseSub({
          id: "66666666-6666-4666-8666-666666666666",
          renewalOn: "2024-02-29",
          cadence: "yearly",
          billingDay: 29,
          status: "active",
        }),
      ],
      "2024-01-01",
      "2024-12-31",
    );
    expect(yearly.map((o) => o.startOn)).toEqual(["2024-02-29"]);

    const yearlyNext = expandSubscriptionRenewalsInRange(
      [
        baseSub({
          id: "66666666-6666-4666-8666-666666666666",
          renewalOn: "2024-02-29",
          cadence: "yearly",
          billingDay: 29,
          status: "active",
        }),
      ],
      "2025-01-01",
      "2025-12-31",
    );
    expect(yearlyNext.map((o) => o.startOn)).toEqual(["2025-02-28"]);

    const yearlyLeap = expandSubscriptionRenewalsInRange(
      [
        baseSub({
          id: "66666666-6666-4666-8666-666666666666",
          renewalOn: "2024-02-29",
          cadence: "yearly",
          billingDay: 29,
          status: "active",
        }),
      ],
      "2026-01-01",
      "2026-12-31",
    );
    expect(yearlyLeap.map((o) => o.startOn)).toEqual(["2026-02-28"]);
  });

  it("excludes archived subscriptions before expansion", () => {
    const occ = expandSubscriptionRenewalsInRange(
      [
        baseSub({
          renewalOn: "2026-07-15",
          cadence: "monthly",
          billingDay: 15,
          status: "archived",
        }),
      ],
      "2026-07-01",
      "2026-07-31",
    );
    expect(occ).toEqual([]);
  });
});

describe("payment reminder adapter", () => {
  it("returns an empty list in V1", () => {
    expect(
      listPaymentReminderOccurrences({
        rangeStart: "2026-07-01",
        rangeEnd: "2026-07-31",
      }),
    ).toEqual([]);
  });
});

describe("calendar day-list helpers", () => {
  function occ(
    overrides: Partial<CalendarOccurrence> &
      Pick<CalendarOccurrence, "id" | "title" | "startOn" | "endOn">,
  ): CalendarOccurrence {
    return {
      sourceKey: "household_events",
      seriesId: "11111111-1111-4111-8111-111111111111",
      notes: "",
      location: "",
      category: "appointment",
      allDay: false,
      startAt: "09:00:00",
      endAt: "10:00:00",
      recurrence: "none",
      href: null,
      readonly: false,
      ...overrides,
    };
  }

  it("accepts school and fun calendars", () => {
    expect(
      createCalendarEventInputSchema.parse({
        title: "Class",
        category: "school",
        allDay: true,
        startOn: "2026-07-14",
        endOn: "2026-07-14",
      }).category,
    ).toBe("school");
    expect(
      createCalendarEventInputSchema.parse({
        title: "Picnic",
        category: "fun",
        allDay: true,
        startOn: "2026-07-14",
        endOn: "2026-07-14",
      }).category,
    ).toBe("fun");
  });

  it("orders all-day events before timed events", () => {
    const sorted = sortCalendarOccurrences([
      occ({
        id: "timed",
        title: "Dentist",
        startOn: "2026-07-14",
        endOn: "2026-07-14",
        allDay: false,
        startAt: "09:00:00",
        endAt: "10:00:00",
      }),
      occ({
        id: "allday",
        title: "Holiday",
        startOn: "2026-07-14",
        endOn: "2026-07-14",
        allDay: true,
        startAt: null,
        endAt: null,
        category: "holiday",
      }),
      occ({
        id: "later",
        title: "Dinner",
        startOn: "2026-07-14",
        endOn: "2026-07-14",
        allDay: false,
        startAt: "18:00:00",
        endAt: "19:00:00",
        category: "fun",
      }),
    ]);
    expect(sorted.map((o) => o.id)).toEqual(["allday", "timed", "later"]);
  });

  it("formats time labels for all-day and timed events", () => {
    expect(
      formatOccurrenceTimeLabel({
        allDay: true,
        startAt: null,
        endAt: null,
      }),
    ).toBe("All day");
    expect(
      formatOccurrenceTimeLabel({
        allDay: false,
        startAt: "14:00:00",
        endAt: "15:30:00",
      }),
    ).toBe("2:00 PM – 3:30 PM");
  });

  it("groups occurrences onto each intersecting day", () => {
    const byDate = groupOccurrencesByDate(
      [
        occ({
          id: "trip",
          title: "Weekend",
          startOn: "2026-07-14",
          endOn: "2026-07-15",
          allDay: true,
          startAt: null,
          endAt: null,
          category: "trip",
        }),
      ],
      ["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16"],
    );
    expect(byDate.get("2026-07-13")).toEqual([]);
    expect(byDate.get("2026-07-14")?.map((o) => o.id)).toEqual(["trip"]);
    expect(byDate.get("2026-07-15")?.map((o) => o.id)).toEqual(["trip"]);
    expect(byDate.get("2026-07-16")).toEqual([]);
  });
});
