import { expect, test } from "@playwright/test";

import { goToBudget, signInAsMember } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

test.describe("budget flows", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMember(page);
  });

  test("loads seeded summary values", async ({ page }) => {
    await goToBudget(page);

    await expect(page.getByTestId("summary-planned")).toHaveText("$500.00");
    await expect(page.getByTestId("summary-actual")).toHaveText("$12.50");
    await expect(page.getByTestId("summary-remaining")).toHaveText("+$487.50");
    await expect(page.getByTestId("budget-summary")).toBeVisible();
    await expect(
      page.getByTestId("category-row-expense-Groceries"),
    ).toBeVisible();
    await expect(page.getByTestId("transactions-list")).toBeVisible();
    await expect(page.getByText("By type")).toHaveCount(0);
  });

  test("adds, edits, and deletes an expense", async ({ page }, testInfo) => {
    await goToBudget(page);

    const payee = `E2E Market ${testInfo.project.name} ${Date.now()}`;

    await page.getByTestId("open-add-transaction").click();
    await page.getByLabel("Amount").fill("8.25");
    await page.getByLabel("Payee (optional)").fill(payee);
    await page.getByTestId("add-transaction-submit").click();

    const createdRow = page
      .locator('[data-testid^="transaction-row-"]')
      .filter({
        hasText: payee,
      });
    await expect(createdRow).toBeVisible();
    await expect(page.getByTestId("summary-actual")).toHaveText("$20.75");

    await createdRow.getByRole("button", { name: "Edit transaction" }).click();
    await page.getByLabel("Amount").fill("9.00");
    await page.getByLabel("Payee (optional)").fill(`${payee} Updated`);
    await page.getByTestId("save-transaction").click();

    const updatedRow = page
      .locator('[data-testid^="transaction-row-"]')
      .filter({
        hasText: `${payee} Updated`,
      });
    await expect(updatedRow).toBeVisible();
    await expect(page.getByTestId("summary-actual")).toHaveText("$21.50");

    await updatedRow
      .getByRole("button", { name: "Delete transaction" })
      .click();
    await page.getByTestId("confirm-delete-transaction").click();

    await expect(
      page.locator('[data-testid^="transaction-row-"]').filter({
        hasText: `${payee} Updated`,
      }),
    ).toHaveCount(0);
    await expect(page.getByTestId("summary-actual")).toHaveText("$12.50");
  });

  test("budget page has no horizontal scroll", async ({ page }) => {
    await goToBudget(page);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
