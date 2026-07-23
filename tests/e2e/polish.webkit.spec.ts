import { expect, test } from "@playwright/test";

import {
  goToBudget,
  goToCalendar,
  goToDashboard,
  goToShopping,
  signInAsMember,
} from "./helpers/auth";

test.describe.configure({ mode: "serial" });

test.describe("UI/UX polish (WebKit)", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMember(page);
  });

  test("dashboard title and shopping warning cleanup", async ({ page }) => {
    await goToDashboard(page);
    await expect(
      page.getByRole("heading", { name: "Today's events" }),
    ).toBeVisible();

    await goToShopping(page);
    await expect(page.getByTestId("shopping-skipped-notice")).toHaveCount(0);
  });

  test("calendar week navigation preserves weekday", async ({ page }) => {
    await goToCalendar(
      page,
      "view=week&week=2026-07-12&month=2026-07&day=2026-07-14",
    );
    await page.getByTestId("calendar-prev").click();
    await expect(page).toHaveURL(/day=2026-07-07/);
    await page.getByTestId("calendar-next").click();
    await expect(page).toHaveURL(/day=2026-07-14/);
  });

  test("budget layout and no horizontal overflow", async ({ page }) => {
    await goToBudget(page);
    await expect(page.getByTestId("budget-summary")).toBeVisible();
    await expect(page.getByText("By type")).toHaveCount(0);

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
