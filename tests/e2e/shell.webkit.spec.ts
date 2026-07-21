import { expect, test } from "@playwright/test";

/**
 * Safari/WebKit smoke coverage for the real target devices (iPhone + iPad).
 */
test("redirects unauthenticated Safari users to sign-in", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/sign-in/);

  await expect(
    page.getByRole("heading", { level: 1, name: "Jella Home" }),
  ).toBeVisible();
  await expect(page.getByLabel("Household email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("sign-in page has no horizontal scroll on Safari devices", async ({
  page,
}) => {
  await page.goto("/sign-in");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
