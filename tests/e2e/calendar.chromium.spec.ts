import { expect, test } from "@playwright/test";

import { goToCalendar, signInAsMember } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

/** Fixed Sunday week for deterministic Calendar e2e (not wall-clock today). */
const WEEK = "2026-07-12";
const DAY = "2026-07-14";

test.describe("calendar flows", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMember(page);
  });

  test("loads week day-list without horizontal overflow", async ({ page }) => {
    await goToCalendar(page, `week=${WEEK}`);

    await expect(page.getByTestId("calendar-panel")).toBeVisible();
    await expect(page.getByTestId("calendar-week-label")).toBeVisible();
    await expect(page.getByTestId("calendar-filters")).toBeVisible();
    await expect(page.getByTestId("calendar-filters-trigger")).toBeVisible();

    await page.getByTestId("calendar-filters-trigger").click();
    await expect(page.getByTestId("calendar-filters-menu")).toBeVisible();
    await expect(page.getByTestId("calendar-filter-appointment")).toBeVisible();
    await expect(page.getByTestId("calendar-filter-school")).toBeVisible();
    await expect(page.getByTestId("calendar-filter-fun")).toBeVisible();
    await expect(
      page.getByTestId("calendar-filter-subscriptions"),
    ).toBeVisible();

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("navigates previous and next week", async ({ page }) => {
    await goToCalendar(page, `week=${WEEK}`);
    await expect(page).toHaveURL(/week=2026-07-12/);

    await page.getByTestId("calendar-prev-week").click();
    await expect(page).toHaveURL(/week=2026-07-05/);

    await page.getByTestId("calendar-next-week").click();
    await expect(page).toHaveURL(/week=2026-07-12/);
  });

  test("canonicalizes mid-week dates to Sunday", async ({ page }) => {
    await goToCalendar(page, `week=${DAY}`);
    await expect(page).toHaveURL(/week=2026-07-12/);
  });

  test("toggles a calendar filter", async ({ page }) => {
    await goToCalendar(page, `week=${WEEK}`);

    await page.getByTestId("calendar-filters-trigger").click();
    const toggle = page.getByTestId("calendar-filter-appointment");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  test("adds, edits, and deletes an event", async ({ page }, testInfo) => {
    await goToCalendar(page, `week=${WEEK}`);

    const title = `E2E Event ${testInfo.project.name} ${Date.now()}`;

    await page.getByTestId("calendar-add-event").click();
    await page.getByLabel("Title").fill(title);
    await page.getByTestId("calendar-category").click();
    await page.getByRole("option", { name: "Appointments" }).click();
    await page.getByLabel("Start date").fill(DAY);
    await page.getByLabel("End date").fill(DAY);
    await page.getByTestId("calendar-event-submit").click();

    const occ = page
      .locator('[data-testid^="calendar-occ-"]')
      .filter({ hasText: title });
    await expect(occ.first()).toBeVisible({ timeout: 15_000 });

    await occ.first().getByRole("button", { name: /Edit / }).click();
    await page.getByLabel("Title").fill(`${title} edited`);
    await page.getByTestId("calendar-event-submit").click();

    const edited = page
      .locator('[data-testid^="calendar-occ-"]')
      .filter({ hasText: `${title} edited` });
    await expect(edited.first()).toBeVisible({ timeout: 15_000 });

    await edited
      .first()
      .getByRole("button", { name: /Delete / })
      .click();
    await page.getByTestId("calendar-delete-confirm").click();
    await expect(
      page.locator('[data-testid^="calendar-occ-"]').filter({
        hasText: `${title} edited`,
      }),
    ).toHaveCount(0);
  });

  test("creates a weekly recurring event", async ({ page }, testInfo) => {
    await goToCalendar(page, `week=${WEEK}`);

    const title = `E2E Recur ${testInfo.project.name} ${Date.now()}`;

    await page.getByTestId("calendar-add-event").click();
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Start date").fill(DAY);
    await page.getByLabel("End date").fill(DAY);
    await page.getByTestId("calendar-recurrence").click();
    await page.getByRole("option", { name: "Weekly" }).click();
    await page.getByTestId("calendar-event-submit").click();

    await expect(
      page.locator('[data-testid^="calendar-occ-"]').filter({ hasText: title }),
    ).toBeVisible({ timeout: 15_000 });

    // Clean up series
    const occ = page
      .locator('[data-testid^="calendar-occ-"]')
      .filter({ hasText: title });
    if ((await occ.count()) > 0) {
      await occ
        .first()
        .getByRole("button", { name: /Delete / })
        .click();
      await page.getByTestId("calendar-delete-confirm").click();
    }
  });
});
