import { expect, type Page } from "@playwright/test";

export const E2E_EMAIL = process.env.E2E_EMAIL ?? "member-a@example.test";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "local-dev-password";

export async function signInAsMember(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(E2E_EMAIL);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
}

export async function goToBudget(page: Page) {
  await page.goto("/budget");
  await expect(page).toHaveURL(/\/budget(?:\?|$)/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Budget" }),
  ).toBeVisible();
}

export async function goToRecipes(page: Page) {
  await page.goto("/recipes");
  await expect(page).toHaveURL(/\/recipes(?:\?|$)/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Recipes" }),
  ).toBeVisible();
}

export async function goToMeals(page: Page) {
  await page.goto("/meals");
  await expect(page).toHaveURL(/\/meals(?:\?|$)/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Meals" }),
  ).toBeVisible();
}

export async function goToShopping(page: Page) {
  await page.goto("/shopping");
  await expect(page).toHaveURL(/\/shopping(?:\?|$)/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Shopping" }),
  ).toBeVisible();
}

export async function goToDashboard(page: Page) {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
}

export const E2E_OUTSIDER_EMAIL =
  process.env.E2E_OUTSIDER_EMAIL ?? "outsider@example.test";
export const E2E_OUTSIDER_PASSWORD =
  process.env.E2E_OUTSIDER_PASSWORD ?? "local-dev-password";

export async function signInAsOutsider(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(E2E_OUTSIDER_EMAIL);
  await page.getByLabel("Password").fill(E2E_OUTSIDER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
}
