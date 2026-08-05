import { expect, test } from "@playwright/test";

import { goToCalendar, signInAsMember } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

const WEEK = "2026-07-12";

test.describe("calendar webkit smoke", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMember(page);
  });

  test("week day-list stays usable", async ({ page }) => {
    await goToCalendar(page, `week=${WEEK}`);
    await expect(page.getByTestId("calendar-panel")).toBeVisible();
    await expect(page.getByTestId("calendar-week-label")).toBeVisible();
    await expect(page.getByTestId("calendar-filters")).toBeVisible();

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
