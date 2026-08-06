import { expect, test } from "@playwright/test";

import { goToMeals, signInAsMember } from "./helpers/auth";

test.describe("meals webkit smoke", () => {
  test("renders the planner and opens add meal", async ({ page }) => {
    await signInAsMember(page);
    await goToMeals(page);

    await expect(page.getByTestId("meals-panel")).toBeVisible();
    await expect(page.getByTestId("meals-today-heading")).toBeVisible();
    await expect(page.getByTestId("meals-today-heading")).not.toContainText(
      "Today",
    );

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.getByTestId("open-add-meal").click();
    await expect(page.getByTestId("meal-recipe-combobox")).toBeVisible();
    await expect(page.getByTestId("meal-slot-select")).toBeVisible();
    await expect(page.getByTestId("meal-recipe-combobox")).not.toBeFocused();
    await page.getByTestId("meal-recipe-combobox").fill("Fixture");
    await page.getByTestId("meal-recipe-option").first().tap();
    await expect(page.getByTestId("meal-recipe-combobox")).toHaveValue(
      "Fixture Spaghetti",
    );
    await expect(page.getByTestId("meal-form-submit")).toBeEnabled();
  });
});
