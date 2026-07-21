import { expect, test } from "@playwright/test";

import { goToCalendar, signInAsMember } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

const WEEK = "2026-07-12";
const DAY = "2026-07-14";
const MONTH = "2026-07";

test.describe("calendar webkit smoke", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMember(page);
  });

  test("week and month views stay usable", async ({ page }) => {
    await goToCalendar(
      page,
      `view=week&week=${WEEK}&month=${MONTH}&day=${DAY}`,
    );
    await expect(page.getByTestId("calendar-panel")).toBeVisible();
    await expect(page.getByTestId("calendar-selected-day")).toBeVisible();
    await expect(page.getByTestId("calendar-range-label")).toBeVisible();

    await page.getByTestId("calendar-view-month").click();
    await expect(page.getByTestId("calendar-month-grid")).toBeVisible();
    await expect(page.getByTestId("calendar-selected-day")).toBeVisible();

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
