import { expect, test } from "@playwright/test";

import { goToSubscriptions, signInAsMember } from "./helpers/auth";

test.describe("subscriptions webkit smoke", () => {
  test("renders subscriptions without horizontal scroll", async ({ page }) => {
    await signInAsMember(page);
    await goToSubscriptions(page);

    await expect(page.getByTestId("subscriptions-panel")).toBeVisible();
    await expect(page.getByText("Netflix").first()).toBeVisible();
    await expect(page.getByText("$15.99 / monthly").first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
