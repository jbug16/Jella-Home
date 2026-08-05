import { expect, test } from "@playwright/test";

import { goToShopping, signInAsMember } from "./helpers/auth";

test.describe("shopping webkit smoke", () => {
  test("renders shopping panel and add form", async ({ page }) => {
    await signInAsMember(page);
    await goToShopping(page);
    await expect(page.getByTestId("shopping-panel")).toBeVisible();
    await expect(page.getByTestId("shopping-add-item")).toBeVisible();

    await page.getByTestId("shopping-add-item").click();
    await expect(page.getByTestId("shopping-item-name")).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
