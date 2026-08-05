import { expect, test } from "@playwright/test";

import { E2E_EMAIL, E2E_PASSWORD } from "./helpers/auth";

test("redirects unauthenticated users to sign-in", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/sign-in/);

  await expect(
    page.getByRole("heading", { level: 1, name: "Jella's Home" }),
  ).toBeVisible();
  await expect(page.getByLabel("Household email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("protected dashboard redirects to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("sign-in preserves safe internal next path with query", async ({
  page,
}) => {
  await page.goto("/budget?month=2026-07");
  await expect(page).toHaveURL(/\/sign-in\?next=/);
  const url = new URL(page.url());
  expect(url.searchParams.get("next")).toBe("/budget?month=2026-07");

  await page.getByLabel("Household email").fill(E2E_EMAIL);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/budget\?month=2026-07/);
});

test("sign-in rejects protocol-relative open redirects", async ({ page }) => {
  await page.goto("/sign-in?next=//attacker.example");
  await page.getByLabel("Household email").fill(E2E_EMAIL);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  expect(page.url()).not.toContain("attacker.example");
});

test("sign-in page has no horizontal scroll", async ({ page }) => {
  await page.goto("/sign-in");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
