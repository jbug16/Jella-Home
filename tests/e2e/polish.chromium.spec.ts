import { expect, test } from "@playwright/test";

import {
  goToBudget,
  goToCalendar,
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
      page.locator("header").filter({ hasText: "Jella Home" }),
    ).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "Today's events" }),
    ).toBeVisible();
  });

  test("mobile shell keeps brand header and bottom nav", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await goToDashboard(page);

    await expect(page.locator("header").getByText("Jella Home")).toBeVisible();
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
      await goToCalendar(
        page,
        "view=week&week=2026-07-12&month=2026-07&day=2026-07-14",
      );
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
});
