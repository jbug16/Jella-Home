import { expect, test } from "@playwright/test";

import {
  goToBudget,
  goToDashboard,
  goToShopping,
  signInAsMember,
} from "./helpers/auth";

test.describe.configure({ mode: "serial" });

test.describe("UI/UX polish (WebKit)", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMember(page);
  });

  test("dashboard and shopping warning cleanup", async ({ page }) => {
    await goToDashboard(page);
    await expect(page.getByTestId("card-meals")).toBeVisible();
    await expect(page.getByRole("link", { name: "Calendar" })).toHaveCount(0);

    await goToShopping(page);
    await expect(page.getByTestId("shopping-skipped-notice")).toHaveCount(0);
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
