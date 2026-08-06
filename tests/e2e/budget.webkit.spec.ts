import { expect, test } from "@playwright/test";

import { signInAsMember } from "./helpers/auth";

test.describe("budget webkit", () => {
  test("switches periods and keeps popup focus and scrolling safe", async ({
    page,
  }) => {
    await signInAsMember(page);
    await page.goto("/budget?view=month&month=2026-07");
    await expect(page.getByTestId("budget-summary")).toBeVisible();
    const periodToggleBox = await page
      .getByTestId("budget-period-year")
      .boundingBox();
    const addButtonBox = await page
      .getByTestId("open-add-transaction")
      .boundingBox();
    expect(periodToggleBox).not.toBeNull();
    expect(addButtonBox).not.toBeNull();
    expect(Math.round(periodToggleBox!.y)).toBe(Math.round(addButtonBox!.y));
    expect(periodToggleBox!.x).toBeLessThan(addButtonBox!.x);
    await page.getByTestId("budget-period-year").click();
    await expect(page).toHaveURL(/view=year&year=2026/);
    const monthToggleBox = await page
      .getByTestId("budget-period-month")
      .boundingBox();
    expect(monthToggleBox).not.toBeNull();
    expect(Math.round(monthToggleBox!.width)).toBe(
      Math.round(periodToggleBox!.width),
    );
    await expect(page.getByTestId("budget-year-summary")).toBeVisible();
    await page.getByTestId("open-add-transaction").click();
    await expect(page.getByLabel("Amount")).not.toBeFocused();
    await expect(page.getByTestId("responsive-form-footer")).toBeInViewport();
    await page
      .locator('[data-slot="sheet-close"], [data-slot="dialog-close"]')
      .first()
      .click();
    await expect(page.getByTestId("responsive-form-shell")).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => ({
          bodyOverflow: document.body.style.overflow,
          bodyPointerEvents: document.body.style.pointerEvents,
        })),
      )
      .toEqual({ bodyOverflow: "", bodyPointerEvents: "" });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
