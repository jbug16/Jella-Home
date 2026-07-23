import { describe, expect, it } from "vitest";

import {
  clampDayToMonth,
  clampDayToWeek,
  shiftSelectedDayByMonths,
  shiftSelectedDayByWeeks,
} from "@/lib/domain/calendar-nav";

describe("calendar-nav", () => {
  it("shifts selected day by weeks and preserves weekday", () => {
    expect(shiftSelectedDayByWeeks("2026-07-14", 1)).toBe("2026-07-21");
    expect(shiftSelectedDayByWeeks("2026-07-14", -1)).toBe("2026-07-07");
  });

  it("shifts across month and year boundaries", () => {
    expect(shiftSelectedDayByWeeks("2026-12-29", 1)).toBe("2027-01-05");
    expect(shiftSelectedDayByMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(shiftSelectedDayByMonths("2026-12-15", 1)).toBe("2027-01-15");
  });

  it("clamps a day into the visible week by weekday", () => {
    expect(clampDayToWeek("2026-07-14", "2026-07-12")).toBe("2026-07-14");
    expect(clampDayToWeek("2026-07-01", "2026-07-12")).toBe("2026-07-15");
  });

  it("clamps a day into the visible month", () => {
    expect(clampDayToMonth("2026-07-14", "2026-07-01")).toBe("2026-07-14");
    expect(clampDayToMonth("2026-01-31", "2026-02-01")).toBe("2026-02-28");
  });
});
