import { expect, test, type Page } from "@playwright/test";

import {
  goToDashboard,
  signInAsMember,
  signInAsOutsider,
} from "./helpers/auth";

test.describe.configure({ mode: "serial" });

async function pickFixtureRecipe(page: Page) {
  await page.getByTestId("meal-recipe-combobox").fill("Fixture Spaghetti");
  await page
    .getByTestId("meal-recipe-option")
    .filter({ hasText: "Fixture Spaghetti" })
    .first()
    .click();
}

async function browserTodayIso(page: Page): Promise<string> {
  return page.evaluate(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
}

async function browserWeekStart(page: Page): Promise<string> {
  return page.evaluate(() => {
    const now = new Date();
    const day = now.getDay();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - day);
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, "0");
    const date = String(start.getDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
  });
}

test.describe("dashboard home", () => {
  test("shows today's meals and budget", async ({ page }) => {
    await signInAsMember(page);
    await goToDashboard(page);

    await expect(page.getByTestId("dashboard-panel")).toBeVisible();
    await expect(page.getByTestId("calendar-day-view")).toHaveCount(0);
    await expect(page.getByTestId("card-meals")).toBeVisible();
    await expect(page.getByTestId("card-budget")).toBeVisible();
    await expect(page.getByTestId("card-grocery")).toHaveCount(0);

    await expect(page.getByTestId("dashboard-budget-remaining")).toContainText(
      "487.50",
    );
  });

  test("CTAs deep-link to meals and budget", async ({ page }) => {
    await signInAsMember(page);
    await goToDashboard(page);

    const weekStart = await browserWeekStart(page);

    await page.getByTestId("dashboard-cta-budget").click();
    await expect(page).toHaveURL(/\/budget(?:\?|$)/);

    await goToDashboard(page);
    await page.getByTestId("dashboard-cta-meals").click();
    await expect(page).toHaveURL(new RegExp(`/meals\\?week=${weekStart}`));
  });

  test("today's meal links to its recipe", async ({ page }) => {
    await signInAsMember(page);

    const today = await browserTodayIso(page);
    const weekStart = await browserWeekStart(page);

    await page.goto(`/meals?week=${weekStart}`);
    await expect(page.getByTestId("meals-panel")).toBeVisible();
    await page.getByTestId("open-add-meal").click();
    // Reset selects the form default day; only click today if it is not already on.
    await page.getByTestId("meal-days-reset").click();
    const todayButton = page.getByTestId(`meal-day-${today}`);
    await expect(todayButton).toBeVisible();
    if ((await todayButton.getAttribute("aria-pressed")) !== "true") {
      await todayButton.click();
    }
    await expect(todayButton).toHaveAttribute("aria-pressed", "true");
    await pickFixtureRecipe(page);
    await page.getByTestId("meal-form-submit").click();
    await expect(
      page.locator('[data-testid^="meal-chip-"]').first(),
    ).toBeVisible({ timeout: 15_000 });

    await goToDashboard(page);
    await expect(page.getByTestId("dashboard-today-meals")).toContainText(
      "Fixture Spaghetti",
    );
    await expect(
      page.getByTestId("dashboard-meal-thumbnail").first(),
    ).toBeVisible();

    await page
      .getByRole("link", { name: /Fixture Spaghetti/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]+/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Fixture Spaghetti",
    );
  });

  test("360px layout has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await signInAsMember(page);
    await goToDashboard(page);
    await expect(page.getByTestId("dashboard-panel")).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("outsider household isolation smoke", async ({ page }) => {
    await signInAsOutsider(page);
    await goToDashboard(page);

    await expect(page.getByTestId("card-budget")).not.toContainText("487.50");
    await expect(page.getByTestId("calendar-day-view")).toHaveCount(0);
  });
});
