import { expect, test } from "@playwright/test";

import {
  goToBudget,
  goToDashboard,
  goToShopping,
  signInAsMember,
} from "./helpers/auth";

test.describe.configure({ mode: "serial" });

async function assertNoHorizontalOverflow(
  page: import("@playwright/test").Page,
) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("UI/UX polish", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMember(page);
  });

  test("desktop shell has no top app header bar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await goToDashboard(page);

    await expect(
      page.getByRole("navigation", { name: "Primary" }),
    ).toBeVisible();
    await expect(
      page.locator("header").filter({ hasText: "Jella's Home" }),
    ).toBeHidden();
    await expect(page.getByTestId("card-meals")).toBeVisible();
  });

  test("mobile shell keeps brand header and bottom nav", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await goToDashboard(page);

    await expect(page.locator("header").getByText("Jella's Home")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Primary" }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("shopping page does not show skipped-meals warning", async ({
    page,
  }) => {
    await goToShopping(page);
    await expect(page.getByTestId("shopping-skipped-notice")).toHaveCount(0);
    await expect(page.getByText(/without recipes were skipped/i)).toHaveCount(
      0,
    );
  });

  test("icon buttons expose accessible names", async ({ page }) => {
    await goToBudget(page);
    await expect(
      page.getByRole("link", { name: "Previous month" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Next month" })).toBeVisible();
  });

  test("budget ledger layout answers planned/spent/remaining", async ({
    page,
  }) => {
    await goToBudget(page);
    await expect(page.getByTestId("summary-remaining")).toBeVisible();
    await expect(page.getByTestId("summary-planned")).toBeVisible();
    await expect(page.getByTestId("summary-actual")).toBeVisible();
    await expect(
      page.getByText("Spent", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add transaction" }),
    ).toBeVisible();
    await expect(page.getByText("By type")).toHaveCount(0);
  });

  test("no horizontal overflow at narrow phone widths", async ({ page }) => {
    for (const width of [320, 360, 390] as const) {
      await page.setViewportSize({
        width,
        height: width === 390 ? 844 : 780,
      });
      await goToDashboard(page);
      await assertNoHorizontalOverflow(page);
      await goToBudget(page);
      await assertNoHorizontalOverflow(page);
      await goToShopping(page);
      await assertNoHorizontalOverflow(page);
    }
  });

  test("short viewport keeps form actions reachable", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 420 });
    await goToBudget(page);
    await page.getByTestId("open-add-transaction").click();
    await expect(page.getByLabel("Amount")).toBeVisible();
    await page.getByLabel("Amount").fill("1.00");
    const submit = page.getByTestId("add-transaction-submit");
    await expect(submit).toBeVisible();
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport();
  });

  test("sheet close and shopping form meet 44px touch targets", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await goToShopping(page);
    await page.getByTestId("shopping-add-item").click();

    const close = page
      .locator('[data-slot="sheet-close"], [data-slot="dialog-close"]')
      .first();
    await expect(close).toBeVisible();
    const closeBox = await close.boundingBox();
    expect(closeBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(closeBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    const nameBox = await page.getByTestId("shopping-item-name").boundingBox();
    expect(nameBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    const submitBox = await page
      .getByTestId("shopping-item-submit")
      .boundingBox();
    expect(submitBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("invalid budget month falls back without error page", async ({
    page,
  }) => {
    await page.goto("/budget?month=2026-99");
    await expect(
      page.getByRole("heading", { level: 1, name: "Budget" }),
    ).toBeVisible();
    await expect(page.getByTestId("summary-remaining")).toBeVisible();
    await expect(page.getByText(/Application error/i)).toHaveCount(0);
  });
});
