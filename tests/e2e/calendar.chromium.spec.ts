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

  test("preserves weekday when navigating previous and next week", async ({
    page,
  }) => {
    await goToCalendar(page, calendarQuery("week"));
    await expect(page).toHaveURL(/day=2026-07-14/);

    const selectedDesktop = page.getByTestId("calendar-week-day-2026-07-14");
    const selectedMobile = page.getByTestId("calendar-week-band-2026-07-14");
    const selected = (await selectedDesktop.isVisible())
      ? selectedDesktop
      : selectedMobile;
    await expect(selected).toHaveAttribute("aria-selected", "true");

    await page.getByTestId("calendar-prev").click();
    await expect(page).toHaveURL(/week=2026-07-05/);
    await expect(page).toHaveURL(/day=2026-07-07/);
    const prevSelected = (await page
      .getByTestId("calendar-week-day-2026-07-07")
      .isVisible()
      .catch(() => false))
      ? page.getByTestId("calendar-week-day-2026-07-07")
      : page.getByTestId("calendar-week-band-2026-07-07");
    await expect(prevSelected).toHaveAttribute("aria-selected", "true");

    await page.getByTestId("calendar-next").click();
    await expect(page).toHaveURL(/week=2026-07-12/);
    await expect(page).toHaveURL(/day=2026-07-14/);
  });

  test("Today selects the local current date", async ({ page }) => {
    await goToCalendar(page, calendarQuery("week"));
    await page.getByTestId("calendar-today").click();

    const todayIso = await page.evaluate(() => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    });

    await expect(page).toHaveURL(new RegExp(`day=${todayIso}`));
  });

  test("clamps mismatched day into the visible week via redirect", async ({
    page,
  }) => {
    await goToCalendar(
      page,
      "view=week&week=2026-07-12&month=2026-07&day=2026-06-30",
    );
    await expect(page).toHaveURL(/week=2026-07-12/);
    await expect(page).toHaveURL(/day=2026-07-14/);
  });

  test("selected day highlight is fully visible", async ({ page }) => {
    await goToCalendar(page, calendarQuery("week"));

    const dayTestId = (await page
      .getByTestId("calendar-week-day-2026-07-14")
      .isVisible())
      ? "calendar-week-day-2026-07-14"
      : "calendar-week-band-2026-07-14";
    const selected = page.getByTestId(dayTestId);
    await expect(selected).toBeVisible();

    const box = await selected.boundingBox();
    expect(box).not.toBeNull();
    const clip = await page.evaluate((testId) => {
      const el = document.querySelector(`[data-testid="${testId}"]`);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      return {
        width: rect.width,
        height: rect.height,
        borderTopWidth: Number.parseFloat(styles.borderTopWidth),
        borderLeftWidth: Number.parseFloat(styles.borderLeftWidth),
        borderRightWidth: Number.parseFloat(styles.borderRightWidth),
        borderBottomWidth: Number.parseFloat(styles.borderBottomWidth),
      };
    }, dayTestId);

    expect(clip).not.toBeNull();
    expect(clip!.width).toBeGreaterThan(20);
    expect(clip!.height).toBeGreaterThan(20);
    expect(clip!.borderTopWidth).toBeGreaterThanOrEqual(2);
    expect(clip!.borderLeftWidth).toBeGreaterThanOrEqual(2);
    expect(clip!.borderRightWidth).toBeGreaterThanOrEqual(2);
    expect(clip!.borderBottomWidth).toBeGreaterThanOrEqual(2);
  });

  test("navigates across a month boundary while preserving day-of-month", async ({
    page,
  }) => {
    await goToCalendar(
      page,
      "view=month&week=2026-07-26&month=2026-07&day=2026-07-31",
    );
    await page.getByTestId("calendar-next").click();
    await expect(page).toHaveURL(/month=2026-08/);
    await expect(page).toHaveURL(/day=2026-08-31/);
  });

  test("toggles subscription renewals source", async ({ page }) => {
    await goToCalendar(page, calendarQuery("week"));

    const toggle = page.getByTestId("calendar-source-subscription_renewals");
    // Prefs persist in the shared local DB across projects — normalize first.
    await expect(toggle).toBeEnabled();
    if ((await toggle.getAttribute("aria-pressed")) !== "true") {
      await toggle.click();
      await expect(toggle).toBeEnabled();
    }
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(toggle).toBeEnabled();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(toggle).toBeEnabled();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  test("adds, edits, and deletes an event", async ({ page }, testInfo) => {
    await goToCalendar(page, calendarQuery("week"));

    // Ensure native events are visible (prefs persist across e2e projects).
    const householdSource = page.getByTestId(
      "calendar-source-household_events",
    );
    if ((await householdSource.getAttribute("aria-pressed")) !== "true") {
      await householdSource.click();
    }

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

    await occ.getByRole("button", { name: "Edit event" }).click();
    await page.getByLabel("Title").fill(`${title} edited`);
    await page.getByTestId("calendar-event-submit").click();

    const edited = page
      .getByTestId("calendar-selected-day")
      .locator('[data-testid^="calendar-occ-"]')
      .filter({ hasText: `${title} edited` });
    await expect(edited).toBeVisible({ timeout: 15_000 });

    await edited.getByRole("button", { name: "Delete event" }).click();
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
      await occ.first().getByRole("button", { name: "Delete event" }).click();
      await page.getByTestId("calendar-delete-confirm").click();
    }
  });
});
