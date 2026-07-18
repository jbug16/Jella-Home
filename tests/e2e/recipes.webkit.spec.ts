import { expect, test } from "@playwright/test";

import { goToRecipes, signInAsMember } from "./helpers/auth";

test.describe("recipes safari smoke", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMember(page);
  });

  test("recipe list renders without horizontal scroll", async ({ page }) => {
    await goToRecipes(page);

    await expect(page.getByTestId("recipes-list")).toBeVisible();
    await expect(
      page
        .locator('[data-testid^="recipe-row-"]')
        .filter({ hasText: "Fixture Spaghetti" }),
    ).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("add recipe form opens and is usable", async ({ page }) => {
    await goToRecipes(page);

    await page.getByTestId("open-add-recipe").click();
    await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
    await expect(page.getByTestId("add-ingredient-row")).toBeVisible();
  });
});
