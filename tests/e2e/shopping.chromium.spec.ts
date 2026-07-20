import { expect, test, type Page } from "@playwright/test";

import { signInAsMember } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

async function pickFixtureRecipe(page: Page) {
  await page.getByTestId("meal-recipe-combobox").fill("Fixture Spaghetti");
  await page
    .getByTestId("meal-recipe-option")
    .filter({ hasText: "Fixture Spaghetti" })
    .first()
    .click();
}

/** Isolate parallel Playwright projects on shared local DB. */
function weekForProject(projectName: string): {
  week: string;
  planDate: string;
} {
  if (projectName.includes("mobile")) {
    return { week: "2026-08-02", planDate: "2026-08-05" };
  }
  return { week: "2026-08-09", planDate: "2026-08-12" };
}

async function expandChecked(page: Page) {
  const toggle = page.getByTestId("shopping-toggle-checked");
  if (await toggle.isVisible().catch(() => false)) {
    const expanded = await toggle.getAttribute("data-state");
    if (expanded !== "open") {
      await toggle.click();
    }
  }
}

async function generateOrRefresh(page: Page) {
  const generate = page.getByTestId("shopping-generate");
  if (await generate.isVisible().catch(() => false)) {
    await generate.click();
    return;
  }
  await page.getByTestId("shopping-refresh").click();
  await page.getByTestId("shopping-refresh-confirm").click();
}

test.describe("shopping list flows", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMember(page);
  });

  test("loads shopping panel for a week", async ({ page }, testInfo) => {
    const { week } = weekForProject(testInfo.project.name);
    await page.goto(`/shopping?week=${week}`);
    await expect(page.getByTestId("shopping-panel")).toBeVisible();
    await expect(page.getByTestId("shopping-week-label")).toBeVisible();
    await expect(
      page
        .getByTestId("shopping-generate")
        .or(page.getByTestId("shopping-refresh")),
    ).toBeVisible();
  });

  test("generates from meals, checks, adds manual, refreshes", async ({
    page,
  }, testInfo) => {
    const { week, planDate } = weekForProject(testInfo.project.name);
    const manualName = `E2E paper ${testInfo.project.name} ${Date.now()}`;

    await page.goto(`/meals?week=${week}`);
    await expect(page.getByTestId("meals-panel")).toBeVisible();
    await page.getByTestId("open-add-meal").click();
    await page.getByTestId("meal-days-reset").click();
    await page.getByTestId(`meal-day-${planDate}`).click();
    await pickFixtureRecipe(page);
    await page.getByTestId("meal-form-submit").click();
    await expect(
      page.locator('[data-testid^="meal-chip-"]').first(),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto(`/shopping?week=${week}`);
    await expect(page.getByTestId("shopping-panel")).toBeVisible();

    // Clear leftover checked rows so the list starts clean for this week.
    if (
      await page
        .getByTestId("shopping-clear-checked")
        .isVisible()
        .catch(() => false)
    ) {
      await page.getByTestId("shopping-clear-checked").click();
      await expect(page.getByTestId("shopping-clear-checked")).toBeHidden({
        timeout: 10_000,
      });
    }

    await generateOrRefresh(page);
    await expect(page.getByText("Olive Oil").first()).toBeVisible({
      timeout: 15_000,
    });
    await expandChecked(page);
    await expect(page.getByText("Spaghetti").first()).toBeVisible();

    const spaghettiRow = page.locator('[data-source="generated"]').filter({
      hasText: "Spaghetti",
    });
    const spaghettiId = (
      (await spaghettiRow.first().getAttribute("data-testid")) ?? ""
    ).replace("shopping-item-", "");
    expect(spaghettiId.length).toBeGreaterThan(0);

    const checkBox = page.getByTestId(`shopping-check-${spaghettiId}`);
    if ((await checkBox.getAttribute("data-state")) !== "checked") {
      await checkBox.click();
    }
    await expect(page.getByTestId("shopping-progress")).toContainText(/1 of/);

    await page.getByTestId("shopping-add-item").click();
    await page.getByTestId("shopping-item-name").fill(manualName);
    await page.getByTestId("shopping-item-submit").click();
    await expect(page.getByText(manualName)).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("shopping-refresh").click();
    await page.getByTestId("shopping-refresh-confirm").click();
    await expect(page.getByText(manualName)).toBeVisible({ timeout: 15_000 });

    await expandChecked(page);
    await expect(
      page
        .locator('[data-source="generated"]')
        .filter({ hasText: "Spaghetti" }),
    ).toHaveCount(1);
    await expect(
      page.locator(`[data-testid="shopping-item-${spaghettiId}"]`),
    ).toBeVisible();

    await page.getByTestId("shopping-clear-checked").click();
    await expect(page.getByText(manualName)).toBeVisible();
  });

  test("no horizontal overflow at narrow viewport", async ({
    page,
  }, testInfo) => {
    const { week } = weekForProject(testInfo.project.name);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(`/shopping?week=${week}`);
    await expect(page.getByTestId("shopping-panel")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
