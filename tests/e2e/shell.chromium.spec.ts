import { expect, test } from "@playwright/test";

test("redirects unauthenticated users to sign-in", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/sign-in/);

  await expect(
    page.getByRole("heading", { level: 1, name: "Jella Home" }),
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

test("sign-in page has no horizontal scroll", async ({ page }) => {
  await page.goto("/sign-in");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
