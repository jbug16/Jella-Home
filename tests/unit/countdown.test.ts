import { describe, expect, it } from "vitest";

import {
  buildCountdownsCardViewModel,
  formatCountdownHeadline,
  formatCountdownUnitLabel,
  mapCountdown,
  type CountdownRow,
} from "@/lib/domain/countdown";
import { buildDashboardCountdownsViewModel } from "@/lib/domain/dashboard";

const HOUSEHOLD = "11111111-1111-4111-8111-111111111111";

function row(
  overrides: Partial<CountdownRow> &
    Pick<CountdownRow, "id" | "title" | "target_on">,
): CountdownRow {
  return {
    household_id: HOUSEHOLD,
    color: "teal",
    created_at: "2026-07-13T12:00:00.000Z",
    updated_at: "2026-07-13T12:00:00.000Z",
    ...overrides,
  };
}

describe("formatCountdownHeadline / formatCountdownUnitLabel", () => {
  it("always shows a day count and unit label", () => {
    expect(formatCountdownHeadline(0)).toBe("0");
    expect(formatCountdownHeadline(1)).toBe("1");
    expect(formatCountdownHeadline(42)).toBe("42");

    expect(formatCountdownUnitLabel(0)).toBe("days");
    expect(formatCountdownUnitLabel(1)).toBe("day");
    expect(formatCountdownUnitLabel(42)).toBe("days");
  });
});

describe("buildCountdownsCardViewModel", () => {
  it("lists upcoming countdowns sorted by date and caps at four", () => {
    const countdowns = [
      mapCountdown(
        row({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
          title: "Later",
          target_on: "2026-08-20",
        }),
      ),
      mapCountdown(
        row({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
          title: "Soon",
          target_on: "2026-07-26",
        }),
      ),
      mapCountdown(
        row({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
          title: "Past",
          target_on: "2026-07-20",
        }),
      ),
      mapCountdown(
        row({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
          title: "Sixth",
          target_on: "2026-09-01",
        }),
      ),
      mapCountdown(
        row({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5",
          title: "Fifth",
          target_on: "2026-08-30",
        }),
      ),
      mapCountdown(
        row({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6",
          title: "Fourth",
          target_on: "2026-08-29",
        }),
      ),
      mapCountdown(
        row({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7",
          title: "Third",
          target_on: "2026-08-28",
        }),
      ),
    ];

    const card = buildCountdownsCardViewModel({
      todayIso: "2026-07-24",
      countdowns,
    });

    expect(card.items).toHaveLength(4);
    expect(card.items[0]?.title).toBe("Soon");
    expect(card.items[0]?.daysRemaining).toBe(2);
    expect(card.items[0]?.relativePhrase).toBe("in 2 days");
    expect(card.items.map((item) => item.title)).not.toContain("Past");
  });

  it("uses numeric day headlines for today and tomorrow", () => {
    const card = buildCountdownsCardViewModel({
      todayIso: "2026-07-24",
      countdowns: [
        mapCountdown(
          row({
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            title: "Tonight",
            target_on: "2026-07-24",
          }),
        ),
        mapCountdown(
          row({
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
            title: "Concert",
            target_on: "2026-07-25",
          }),
        ),
      ],
    });

    expect(card.items[0]?.headline).toBe("0");
    expect(card.items[0]?.unitLabel).toBe("days");
    expect(card.items[1]?.headline).toBe("1");
    expect(card.items[1]?.unitLabel).toBe("day");
  });
});

describe("buildDashboardCountdownsViewModel", () => {
  it("delegates to the countdown card builder", () => {
    const card = buildDashboardCountdownsViewModel({
      todayIso: "2026-07-24",
      countdowns: [
        mapCountdown(
          row({
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            title: "Trip",
            target_on: "2026-08-01",
          }),
        ),
      ],
    });

    expect(card.todayIso).toBe("2026-07-24");
    expect(card.items).toHaveLength(1);
    expect(card.items[0]?.dateLabel).toBe("08-01-2026");
  });
});
