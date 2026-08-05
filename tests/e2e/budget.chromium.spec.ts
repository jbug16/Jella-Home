import { expect, test, type Page } from "@playwright/test";

import { goToBudget, signInAsMember } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

async function openAddTransaction(page: Page) {
  await page.getByTestId("open-add-transaction").click();
}

async function openEditTransaction(
  page: Page,
  row: ReturnType<Page["locator"]>,
) {
  const mobileEdit = row.getByTestId(/^edit-transaction-/).first();
  if (await mobileEdit.isVisible()) {
    await mobileEdit.click();
    return;
  }
  await row.getByRole("button", { name: "Edit transaction" }).click();
}

async function deleteTransaction(page: Page, row: ReturnType<Page["locator"]>) {
  const desktopDelete = row.getByRole("button", { name: "Delete transaction" });
  if (await desktopDelete.isVisible()) {
    await desktopDelete.click();
    return;
  }
  const rowTestId = await row.getAttribute("data-testid");
  const transactionId = rowTestId?.replace("transaction-row-", "");
  await openEditTransaction(page, row);
  await page
    .getByTestId(`delete-transaction-${transactionId}`)
    .filter({ visible: true })
    .click();
}

test.describe("budget flows", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMember(page);
  });

  test("loads seeded summary values", async ({ page }) => {
    await goToBudget(page);

    await expect(page.getByTestId("summary-planned")).toHaveText("$650.00");
    await expect(page.getByTestId("summary-actual")).toHaveText("$294.50");
    await expect(page.getByTestId("summary-remaining")).toHaveText("$355.50");
    await expect(page.getByTestId("budget-summary")).toBeVisible();
    await expect(page.getByTestId("category-row-expense-Food")).toBeVisible();
    await page.getByRole("tab", { name: "Transactions" }).click();
    await expect(page.getByTestId("transactions-list")).toBeVisible();
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByText("By type")).toHaveCount(0);
  });

  test("adds, edits, and deletes an expense", async ({ page }, testInfo) => {
    await goToBudget(page);

    const payee = `E2E Market ${testInfo.project.name} ${Date.now()}`;

    await openAddTransaction(page);
    await page.getByLabel("Amount").fill("8.25");
    await page.getByLabel("Payee (optional)").fill(payee);
    await page.getByTestId("add-transaction-submit").click();
    await page.getByRole("tab", { name: "Transactions" }).click();

    const createdRow = page
      .locator('[data-testid^="transaction-row-"]')
      .filter({
        hasText: payee,
      });
    await expect(createdRow).toBeVisible();
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByTestId("summary-actual")).toHaveText("$302.75");

    await page.getByRole("tab", { name: "Transactions" }).click();
    await openEditTransaction(page, createdRow);
    await page.getByLabel("Amount").fill("9.00");
    await page.getByLabel("Payee (optional)").fill(`${payee} Updated`);
    await page.getByTestId("save-transaction").click();

    const updatedRow = page
      .locator('[data-testid^="transaction-row-"]')
      .filter({
        hasText: `${payee} Updated`,
      });
    await expect(updatedRow).toBeVisible();
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByTestId("summary-actual")).toHaveText("$303.50");

    await page.getByRole("tab", { name: "Transactions" }).click();
    await deleteTransaction(page, updatedRow);
    await page.getByTestId("confirm-delete-transaction").click();

    await expect(
      page.locator('[data-testid^="transaction-row-"]').filter({
        hasText: `${payee} Updated`,
      }),
    ).toHaveCount(0);
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByTestId("summary-actual")).toHaveText("$294.50");
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
