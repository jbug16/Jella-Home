import { expect, test } from "@playwright/test";

import { goToCalendar, signInAsMember } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

/** Fixed Sunday week for deterministic Calendar e2e (not wall-clock today). */
const WEEK = "2026-07-12";
const DAY = "2026-07-14";
const MONTH = "2026-07";

function calendarQuery(view: "week" | "month", day = DAY): string {
  return `view=${view}&week=${WEEK}&month=${MONTH}&day=${day}`;
}

test.describe("calendar flows", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsMember(page);
  });

  test("loads week view without horizontal overflow", async ({ page }) => {
    await goToCalendar(page, calendarQuery("week"));

    await expect(page.getByTestId("calendar-panel")).toBeVisible();
    await expect(page.getByTestId("calendar-view-week")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByTestId("calendar-range-label")).toBeVisible();
    await expect(
      page.getByTestId("calendar-source-household_events"),
    ).toBeVisible();
    await expect(
      page.getByTestId("calendar-source-subscription_renewals"),
    ).toBeVisible();
    await expect(
      page.getByTestId("calendar-source-payment_reminders"),
    ).toHaveCount(0);

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("adds, edits, and deletes an event", async ({ page }, testInfo) => {
    await goToCalendar(page, calendarQuery("week"));

    const title = `E2E Event ${testInfo.project.name} ${Date.now()}`;

    await page.getByTestId("calendar-add-event").click();
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Category").click();
    await page.getByRole("option", { name: "Appointment" }).click();
    await page.getByTestId("calendar-event-submit").click();

    const occ = page
      .getByTestId("calendar-selected-day")
      .locator('[data-testid^="calendar-occ-"]')
      .filter({ hasText: title });
    await expect(occ).toBeVisible({ timeout: 15_000 });

    await occ.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Title").fill(`${title} edited`);
    await page.getByTestId("calendar-event-submit").click();

    const edited = page
      .getByTestId("calendar-selected-day")
      .locator('[data-testid^="calendar-occ-"]')
      .filter({ hasText: `${title} edited` });
    await expect(edited).toBeVisible();

    await edited.getByRole("button", { name: "Delete" }).click();
    await page.getByTestId("calendar-delete-confirm").click();
    await expect(
      page.getByTestId("calendar-selected-day").getByText(`${title} edited`),
    ).toHaveCount(0);
  });

  test("creates a weekly recurring event and switches to month", async ({
    page,
  }, testInfo) => {
    await goToCalendar(page, calendarQuery("week"));

    const title = `E2E Recur ${testInfo.project.name} ${Date.now()}`;

    await page.getByTestId("calendar-add-event").click();
    await page.getByLabel("Title").fill(title);
    await page.getByTestId("calendar-recurrence").click();
    await page.getByRole("option", { name: "Weekly" }).click();
    await page.getByTestId("calendar-event-submit").click();

    await expect(
      page.getByTestId("calendar-selected-day").getByText(title),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("calendar-view-month").click();
    await expect(page).toHaveURL(/view=month/);
    await expect(page.getByTestId("calendar-month-grid")).toBeVisible();
    await expect(page.getByTestId("calendar-selected-day")).toBeVisible();

    // Clean up series
    const occ = page
      .getByTestId("calendar-selected-day")
      .locator('[data-testid^="calendar-occ-"]')
      .filter({ hasText: title });
    if ((await occ.count()) > 0) {
      await occ.first().getByRole("button", { name: "Delete" }).click();
      await page.getByTestId("calendar-delete-confirm").click();
    }
  });

  test("toggles subscription renewals source", async ({ page }) => {
    await goToCalendar(page, calendarQuery("week"));

    const toggle = page.getByTestId("calendar-source-subscription_renewals");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  test("navigates previous and next week on Sunday boundaries", async ({
    page,
  }) => {
    await goToCalendar(page, calendarQuery("week"));
    await page.getByTestId("calendar-prev").click();
    await expect(page).toHaveURL(/week=2026-07-05/);
    await page.getByTestId("calendar-next").click();
    await expect(page).toHaveURL(/week=2026-07-12/);
  });
});
