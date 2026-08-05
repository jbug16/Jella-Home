import { expect, test } from "@playwright/test";

import { goToDashboard, signInAsMember } from "./helpers/auth";

test.describe("dashboard webkit smoke", () => {
  test("renders the dashboard and opens meals", async ({ page }) => {
    await signInAsMember(page);
    await goToDashboard(page);

    await expect(page.getByTestId("dashboard-panel")).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.getByTestId("dashboard-cta-meals").click();
    await expect(page).toHaveURL(/\/meals(?:\?|$)/);
  });
});
