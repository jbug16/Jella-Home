import { expect, test, type Page } from "@playwright/test";

import {
  goToSubscriptions,
  signInAsMember,
  signInAsOutsider,
} from "./helpers/auth";

test.describe.configure({ mode: "serial" });

async function localTodayIso(page: Page): Promise<string> {
  return page.evaluate(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
}

function addDaysIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  date.setDate(date.getDate() + delta);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test.describe("subscriptions flows", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMember(page);
  });

  test("shows summary and charge per cycle for seeded subscriptions", async ({
    page,
  }) => {
    await goToSubscriptions(page);

    await expect(page.getByTestId("subscriptions-panel")).toBeVisible();
    await expect(page.getByTestId("summary-monthly-total")).toBeVisible();
    await expect(page.getByTestId("summary-yearly-total")).toBeVisible();
    await expect(page.getByTestId("summary-active-count")).toBeVisible();
    await expect(page.getByText("Netflix").first()).toBeVisible();
    await expect(page.getByText("$15.99 / monthly").first()).toBeVisible();
    await expect(page.getByText("Spotify").first()).toBeVisible();
    await expect(page.getByText("Progressive").first()).toBeVisible();
    await expect(page.getByText("Monthly equivalent")).toHaveCount(0);
    await expect(page.getByText("Fixture Streaming")).toHaveCount(0);
    await expect(page.getByTestId("toggle-archived")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Archive" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Restore" })).toHaveCount(0);
    await expect(page.getByText("Hulu")).toHaveCount(0);
  });

  test("adds, edits, and deletes a subscription", async ({
    page,
  }, testInfo) => {
    await goToSubscriptions(page);

    const today = await localTodayIso(page);
    const soon = addDaysIso(today, 3);
    const later = addDaysIso(today, 20);
    const vendor = `E2E Sub ${testInfo.project.name} ${Date.now()}`;

    await page.getByTestId("open-add-subscription").click();
    await page.getByLabel("Vendor").fill(vendor);
    await page.getByLabel("Amount").fill("15.99");
    await page.getByLabel("Billing frequency").click();
    await page.getByRole("option", { name: "Monthly" }).click();
    await page.getByLabel("Next billing").fill(soon);
    await page.getByLabel("Category (optional)").fill("Entertainment");
    await page.getByTestId("add-subscription-submit").click();

    const row = page.locator('[data-testid^="subscription-row-"]').filter({
      hasText: vendor,
    });
    await expect(row).toBeVisible();
    await expect(row.getByText("$15.99 / monthly")).toBeVisible();
    await expect(row.getByText(`Next billing ${soon}`)).toBeVisible();
    await expect(row.getByText("Entertainment")).toBeVisible();
    await expect(row.getByText("Monthly equivalent")).toHaveCount(0);
    await expect(row.getByRole("button", { name: "Delete" })).toBeVisible();

    await row.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Amount").fill("720.00");
    await page.getByLabel("Billing frequency").click();
    await page.getByRole("option", { name: "Yearly" }).click();
    await page.getByLabel("Next billing").fill(later);
    await page.getByTestId("save-subscription").click();

    const updated = page.locator('[data-testid^="subscription-row-"]').filter({
      hasText: vendor,
    });
    await expect(updated.getByText("$720.00 / yearly")).toBeVisible();
    await expect(updated.getByText(`Next billing ${later}`)).toBeVisible();
    await expect(updated.getByText("Monthly equivalent")).toHaveCount(0);

    await updated.getByRole("button", { name: "Delete" }).click();
    const deleteDialog = page.getByRole("alertdialog");
    await expect(
      deleteDialog.getByRole("heading", { name: "Remove from your list?" }),
    ).toBeVisible();
    await expect(deleteDialog).toContainText(
      `“${vendor}” will be removed from your subscriptions.`,
    );
    await expect(deleteDialog.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(
      deleteDialog.getByTestId("confirm-delete-subscription"),
    ).toBeVisible();
    await page.getByTestId("confirm-delete-subscription").click();

    await expect(
      page.locator('[data-testid^="subscription-row-"]').filter({
        hasText: vendor,
      }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Restore" })).toHaveCount(0);
  });

  test("orders active list by next billing date", async ({
    page,
  }, testInfo) => {
    await goToSubscriptions(page);

    const today = await localTodayIso(page);
    const earlier = addDaysIso(today, 1);
    const later = addDaysIso(today, 5);
    const stamp = Date.now();
    const first = `E2E First ${testInfo.project.name} ${stamp}`;
    const second = `E2E Second ${testInfo.project.name} ${stamp}`;

    for (const [vendor, date] of [
      [second, later],
      [first, earlier],
    ] as const) {
      await page.getByTestId("open-add-subscription").click();
      const vendorField = page.getByLabel("Vendor");
      await expect(vendorField).toBeVisible({ timeout: 10_000 });
      await vendorField.fill(vendor);
      await page.getByLabel("Amount").fill("10.00");
      await page.getByLabel("Next billing").fill(date);
      await page.getByTestId("add-subscription-submit").click();
      await expect(
        page.locator('[data-testid^="subscription-row-"]').filter({
          hasText: vendor,
        }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("add-subscription-submit")).toHaveCount(0);
    }

    const listText = await page.getByTestId("subscriptions-list").innerText();
    expect(listText.indexOf(first)).toBeGreaterThanOrEqual(0);
    expect(listText.indexOf(first)).toBeLessThan(listText.indexOf(second));
  });

  test("subscriptions page has no horizontal scroll", async ({ page }) => {
    await goToSubscriptions(page);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("subscriptions empty state", () => {
  test("outsider household sees empty state", async ({ page }) => {
    await signInAsOutsider(page);
    await goToSubscriptions(page);
    await expect(page.getByText("No subscriptions yet")).toBeVisible();
  });
});
