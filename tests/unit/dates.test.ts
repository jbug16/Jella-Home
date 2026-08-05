import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_HOUSEHOLD_TIME_ZONE,
  calendarDaysBetween,
  formatIsoDateUs,
  formatRelativeDayPhrase,
  isValidIsoDate,
  isValidIsoMonth,
  resolveMonthStartParam,
  todayIsoDate,
} from "@/lib/domain/dates";

describe("todayIsoDate (household timezone)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses America/New_York by default near UTC midnight", () => {
    // 2026-07-24 02:30 UTC = 2026-07-23 22:30 EDT
    const now = new Date("2026-07-24T02:30:00.000Z");
    expect(todayIsoDate(now, DEFAULT_HOUSEHOLD_TIME_ZONE)).toBe("2026-07-23");
  });

  it("rolls to the next local day after Eastern midnight", () => {
    // 2026-07-24 04:30 UTC = 2026-07-24 00:30 EDT
    const now = new Date("2026-07-24T04:30:00.000Z");
    expect(todayIsoDate(now, DEFAULT_HOUSEHOLD_TIME_ZONE)).toBe("2026-07-24");
  });

  it("handles spring-forward DST morning in Eastern time", () => {
    // 2026-03-08 07:30 UTC = 2026-03-08 03:30 EDT (after 2am → 3am jump)
    const now = new Date("2026-03-08T07:30:00.000Z");
    expect(todayIsoDate(now, "America/New_York")).toBe("2026-03-08");
  });

  it("handles fall-back DST evening in Eastern time", () => {
    // 2026-11-01 05:30 UTC = 2026-11-01 01:30 EDT (first 1:30)
    const now = new Date("2026-11-01T05:30:00.000Z");
    expect(todayIsoDate(now, "America/New_York")).toBe("2026-11-01");
  });

  it("reads NEXT_PUBLIC_HOUSEHOLD_TIME_ZONE", () => {
    vi.stubEnv("NEXT_PUBLIC_HOUSEHOLD_TIME_ZONE", "UTC");
    const now = new Date("2026-07-24T02:30:00.000Z");
    expect(todayIsoDate(now)).toBe("2026-07-24");
  });
});

describe("iso date and month validation", () => {
  it("rejects impossible calendar days", () => {
    expect(isValidIsoDate("2026-99-01")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("2026-07-23")).toBe(true);
  });

  it("rejects invalid months", () => {
    expect(isValidIsoMonth("2026-00")).toBe(false);
    expect(isValidIsoMonth("2026-13")).toBe(false);
    expect(isValidIsoMonth("2026-99")).toBe(false);
    expect(isValidIsoMonth("2026-07")).toBe(true);
  });

  it("resolveMonthStartParam canonicalizes or rejects", () => {
    expect(resolveMonthStartParam("2026-07")).toBe("2026-07-01");
    expect(resolveMonthStartParam("2026-07-15")).toBe("2026-07-01");
    expect(resolveMonthStartParam("2026-99")).toBeNull();
    expect(resolveMonthStartParam("2026-13-01")).toBeNull();
    expect(resolveMonthStartParam("not-a-date")).toBeNull();
  });
});

describe("US date and relative day phrases", () => {
  it("formats ISO dates as MM-DD-YYYY", () => {
    expect(formatIsoDateUs("2026-07-24")).toBe("07-24-2026");
    expect(formatIsoDateUs("2026-01-05")).toBe("01-05-2026");
  });

  it("computes signed calendar day differences", () => {
    expect(calendarDaysBetween("2026-07-20", "2026-07-24")).toBe(4);
    expect(calendarDaysBetween("2026-07-24", "2026-07-20")).toBe(-4);
    expect(calendarDaysBetween("2026-07-24", "2026-07-24")).toBe(0);
  });

  it("phrases relative days for today, tomorrow, future, and past", () => {
    const today = "2026-07-24";
    expect(formatRelativeDayPhrase("2026-07-24", today)).toBe("today");
    expect(formatRelativeDayPhrase("2026-07-25", today)).toBe("tomorrow");
    expect(formatRelativeDayPhrase("2026-07-27", today)).toBe("in 3 days");
    expect(formatRelativeDayPhrase("2026-07-23", today)).toBe("1 day ago");
    expect(formatRelativeDayPhrase("2026-07-20", today)).toBe("4 days ago");
  });
});
