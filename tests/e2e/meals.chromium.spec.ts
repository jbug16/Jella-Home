import { expect, test } from "@playwright/test";

import { goToMeals, signInAsMember } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

async function pickFixtureRecipe(page: import("@playwright/test").Page) {
  await page.getByTestId("meal-recipe-combobox").fill("Fixture Spaghetti");
  await page
    .getByTestId("meal-recipe-option")
    .filter({ hasText: "Fixture Spaghetti" })
    .first()
    .click();
}

async function openDeleteMeal(
  page: import("@playwright/test").Page,
  mealId: string,
) {
  const deleteButton = page.locator(
    `[data-testid="meal-delete-${mealId}"]:visible`,
  );
  if (await deleteButton.isVisible()) {
    await deleteButton.click();
    return;
  }
  await page.getByTestId(`meal-chip-open-${mealId}`).click();
  await deleteButton.click();
}

test.describe("meal planner flows", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMember(page);
  });

  test("loads the week planner", async ({ page }) => {
    await goToMeals(page);

    await expect(page.getByTestId("meals-panel")).toBeVisible();
    await expect(page.getByTestId("meals-week-label")).toBeVisible();
    await expect(page.getByTestId("open-add-meal")).toBeVisible();
    await expect(page.getByTestId("meals-today-heading")).toBeVisible();
    await expect(page.getByTestId("meals-today-heading")).not.toContainText(
      "Today",
    );
  });

  test("assigns, edits notes, and deletes a meal", async ({
    page,
  }, testInfo) => {
    // Pin the Sunday-start week containing Wednesday 2026-07-15.
    await page.goto("/meals?week=2026-07-12");
    await expect(page.getByTestId("meals-panel")).toBeVisible();

    const notes = `E2E meal ${testInfo.project.name} ${Date.now()}`;
    const editedNotes = `${notes} edited`;
    const planDate = "2026-07-15"; // Wednesday

    await page.getByTestId("open-add-meal").click();
    await expect(page.getByTestId("meal-days-picker")).toBeVisible();
    // Reset then select only Wednesday in the multi-day picker.
    await page.getByTestId("meal-days-reset").click();
    for (const day of [
      "2026-07-12",
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
    ]) {
      const chip = page.getByTestId(`meal-day-${day}`);
      const pressed = await chip.getAttribute("aria-pressed");
      const shouldBeSelected = day === planDate;
      if (shouldBeSelected && pressed !== "true") {
        await chip.click();
      }
      if (!shouldBeSelected && pressed === "true") {
        await chip.click();
      }
    }
    await expect(page.getByTestId(`meal-day-${planDate}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await pickFixtureRecipe(page);
    await page.getByTestId("meal-notes").fill(notes);
    await expect(page.getByTestId("meal-form-submit")).toBeEnabled();
    await page.getByTestId("meal-form-submit").click();

    await expect(
      page.locator(`[data-meal-notes="${notes}"]`).first(),
    ).toBeVisible({ timeout: 15_000 });
    const sharedMealRow = page.locator(
      `[data-slot="meal-summary-row"][data-meal-notes="${notes}"]`,
    );
    await expect(sharedMealRow).toBeVisible();
    await expect(
      sharedMealRow.locator('[data-slot="meal-summary-thumbnail"]'),
    ).toBeVisible();

    const mealId = await page
      .locator(`[data-meal-notes="${notes}"][data-testid^="meal-chip-"]`)
      .first()
      .evaluate((el) => {
        const testId = el.getAttribute("data-testid") ?? "";
        return testId.replace(/^meal-chip-(?:open-)?/, "");
      });
    expect(mealId.length).toBeGreaterThan(0);

    // Edit notes via click-to-edit on the meal tile
    await page.getByTestId(`meal-chip-open-${mealId}`).click();
    await expect(
      page.getByRole("heading", { name: "Edit meal" }),
    ).toBeVisible();
    await page.getByTestId("meal-notes").fill(editedNotes);
    await page.getByTestId("meal-form-submit").click();
    await expect(
      page.locator(`[data-meal-notes="${editedNotes}"]`).first(),
    ).toBeVisible();

    // Delete cancel then confirm
    await openDeleteMeal(page, mealId);
    await expect(
      page.getByRole("heading", { name: "Remove this meal?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId(`meal-chip-open-${mealId}`)).toBeVisible();

    await openDeleteMeal(page, mealId);
    await page.getByTestId("confirm-delete-meal").click();
    await expect(page.getByTestId(`meal-chip-${mealId}`)).toHaveCount(0);
  });

  test("week navigation crosses a month boundary", async ({ page }) => {
    await page.goto("/meals?week=2026-07-26");
    await expect(page.getByTestId("meals-week-label")).toContainText("Jul");

    await page.getByTestId("meals-next-week").click();
    await expect(page).toHaveURL(/week=2026-08-02/);
    await expect(page.getByTestId("meals-week-label")).toContainText("Aug");

    await page.getByTestId("meals-prev-week").click();
    await expect(page).toHaveURL(/week=2026-07-26/);
  });

  test("canonicalizes mid-week query params to Sunday", async ({ page }) => {
    await page.goto("/meals?week=2026-07-15");
    await expect(page).toHaveURL(/week=2026-07-12/);
    await expect(page.getByTestId("meals-week-label")).toBeVisible();
  });

  test("invalid week query falls back without an error page", async ({
    page,
  }) => {
    await page.goto("/meals?week=not-a-date");
    await expect(
      page.getByRole("heading", { level: 1, name: "Meals" }),
    ).toBeVisible();
    await expect(page.getByTestId("meals-panel")).toBeVisible();
  });

  test("no horizontal overflow at the current viewport", async ({ page }) => {
    await goToMeals(page);
    await expect(page.getByTestId("meals-panel")).toBeVisible();
    if ((page.viewportSize()?.width ?? 0) < 1024) {
      await expect(page.getByTestId("meals-day-spine")).toBeVisible();
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
