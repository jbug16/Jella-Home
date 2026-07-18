import { expect, test } from "@playwright/test";

import { goToRecipes, signInAsMember } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

// A minimal 1x1 PNG so we can upload without committing a binary fixture.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64",
);

async function uploadImage(page: import("@playwright/test").Page) {
  await page.getByTestId("recipe-image-input").setInputFiles({
    name: "recipe.png",
    mimeType: "image/png",
    buffer: PNG_1X1,
  });
}

/**
 * Set quantity + unit, then choose the ingredient name via the combobox.
 * Clicks whichever option appears: the "Add …" row for a brand-new name, or the
 * existing match (the local DB is shared, so a name may already exist).
 */
async function fillIngredient(
  page: import("@playwright/test").Page,
  index: number,
  values: { quantity?: string; unit?: string; name: string },
) {
  if (values.quantity !== undefined) {
    await page
      .getByLabel(`Quantity for ingredient ${index}`)
      .fill(values.quantity);
  }
  if (values.unit !== undefined) {
    await page
      .getByRole("combobox", { name: `Unit for ingredient ${index}` })
      .click();
    await page.getByTestId(`unit-option-${values.unit}`).click();
  }
  await page.getByLabel(`Ingredient name for row ${index}`).fill(values.name);
  await page
    .locator(
      '[data-testid="ingredient-add-new"], [data-testid="ingredient-option"]',
    )
    .filter({ hasText: values.name })
    .first()
    .click();
}

test.describe("recipe flows", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMember(page);
  });

  test("loads the seeded recipe list", async ({ page }) => {
    await goToRecipes(page);

    await expect(page.getByTestId("recipes-list")).toBeVisible();
    await expect(
      page
        .locator('[data-testid^="recipe-row-"]')
        .filter({ hasText: "Fixture Spaghetti" }),
    ).toBeVisible();
  });

  test("creates, views, edits, and deletes a recipe", async ({
    page,
  }, testInfo) => {
    await goToRecipes(page);

    const name = `E2E Recipe ${testInfo.project.name} ${Date.now()}`;

    // Create with a photo and two ingredients; the second reuses the seeded
    // "Spaghetti" via the combobox, the first adds a new ingredient.
    await page.getByTestId("open-add-recipe").click();
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Servings").fill("4");
    await uploadImage(page);
    await expect(page.getByTestId("recipe-image-preview")).toBeVisible();
    await fillIngredient(page, 1, {
      quantity: "2",
      unit: "cup",
      name: "Tomato",
    });
    await page.getByTestId("add-ingredient-row").click();
    await fillIngredient(page, 2, {
      quantity: "200",
      unit: "g",
      name: "Spaghetti",
    });
    await page.getByTestId("create-recipe-submit").click();

    const createdRow = page
      .locator('[data-testid^="recipe-row-"]')
      .filter({ hasText: name });
    await expect(createdRow).toBeVisible();
    // The uploaded photo renders as a thumbnail in the list.
    await expect(createdRow.getByTestId("recipe-thumbnail")).toBeVisible();

    // View detail; the hero image and ingredients render in entered order.
    await createdRow.getByRole("link").click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByTestId("recipe-hero-image")).toBeVisible();
    const items = page.getByTestId("recipe-ingredients").getByRole("listitem");
    await expect(items.nth(0)).toContainText("Tomato");
    await expect(items.nth(1)).toContainText("Spaghetti");

    // Edit: rename, change a quantity, and reorder the ingredients.
    await page.getByTestId("open-edit-recipe").click();
    await page.getByLabel("Name", { exact: true }).fill(`${name} Updated`);
    await page.getByLabel("Quantity for ingredient 1").fill("3");
    await page.getByRole("button", { name: /Move Tomato down/ }).click();
    await page.getByTestId("save-recipe").click();

    await expect(
      page.getByRole("heading", { level: 1, name: `${name} Updated` }),
    ).toBeVisible();
    const reordered = page
      .getByTestId("recipe-ingredients")
      .getByRole("listitem");
    await expect(reordered.nth(0)).toContainText("Spaghetti");
    await expect(reordered.nth(1)).toContainText("Tomato");

    // Delete: confirm and return to the list; seeded recipe remains.
    await page.getByTestId("open-delete-recipe").click();
    await page.getByTestId("confirm-delete-recipe").click();
    await expect(page).toHaveURL(/\/recipes(?:\?|$)/);
    await expect(
      page
        .locator('[data-testid^="recipe-row-"]')
        .filter({ hasText: `${name} Updated` }),
    ).toHaveCount(0);
    await expect(
      page
        .locator('[data-testid^="recipe-row-"]')
        .filter({ hasText: "Fixture Spaghetti" }),
    ).toBeVisible();
  });

  test("search narrows the list", async ({ page }) => {
    await goToRecipes(page);

    await page.getByTestId("recipe-search").fill("Fixture Spaghetti");
    await expect(
      page
        .locator('[data-testid^="recipe-row-"]')
        .filter({ hasText: "Fixture Spaghetti" }),
    ).toBeVisible();

    await page.getByTestId("recipe-search").fill("no-such-recipe-xyz");
    await expect(page.getByTestId("recipes-no-results")).toBeVisible();
  });

  test("recipe list has no horizontal scroll", async ({ page }) => {
    await goToRecipes(page);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
