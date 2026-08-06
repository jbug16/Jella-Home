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
    await expect(page.getByLabel("Name", { exact: true })).not.toBeFocused();
    await expect(page.getByTestId("responsive-form-footer")).toBeVisible();

    const ingredientName = await page
      .getByLabel("Ingredient name for row 1")
      .boundingBox();
    const ingredientQuantity = await page
      .getByLabel("Quantity for ingredient 1")
      .boundingBox();
    expect(ingredientName).not.toBeNull();
    expect(ingredientQuantity).not.toBeNull();
    expect(ingredientName!.y).toBeLessThan(ingredientQuantity!.y);
  });

  test("recipe detail keeps metadata and actions compact", async ({ page }) => {
    await goToRecipes(page);
    await page
      .locator('[data-testid^="recipe-row-"]')
      .filter({ hasText: "Fixture Spaghetti" })
      .getByRole("link")
      .click();

    await expect(page.getByLabel("Back to recipes")).toBeVisible();
    await expect(page.getByLabel("Edit recipe")).toBeVisible();
    await expect(page.getByLabel("Delete recipe")).toBeVisible();

    const metadataCells = page
      .getByTestId("recipe-metadata")
      .locator(":scope > div");
    await expect(metadataCells).toHaveCount(4);
    const metadataBoxes = await metadataCells.evaluateAll((cells) =>
      cells.map((cell) => cell.getBoundingClientRect().top),
    );
    expect(new Set(metadataBoxes.map(Math.round)).size).toBe(1);

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
