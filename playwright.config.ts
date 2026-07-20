import { defineConfig, devices } from "@playwright/test";

/**
 * E2e runs against the production build (`next start`) rather than the dev
 * server, so tests exercise the same output that ships. The `verify` script
 * runs `next build` before `test:e2e`; to run e2e on its own, build first.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.PLAYWRIGHT_WORKERS
    ? Number(process.env.PLAYWRIGHT_WORKERS)
    : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-desktop",
      testMatch: /shell\.chromium\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "chromium-mobile-360",
      testMatch: /shell\.chromium\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 780 },
      },
    },
    {
      name: "budget-chromium-desktop",
      testMatch: /budget\.chromium\.spec\.ts/,
      fullyParallel: false,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "budget-chromium-mobile-360",
      testMatch: /budget\.chromium\.spec\.ts/,
      fullyParallel: false,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 780 },
      },
    },
    {
      name: "recipes-chromium-desktop",
      testMatch: /recipes\.chromium\.spec\.ts/,
      fullyParallel: false,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "recipes-chromium-mobile-360",
      testMatch: /recipes\.chromium\.spec\.ts/,
      fullyParallel: false,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 780 },
      },
    },
    {
      name: "meals-chromium-desktop",
      testMatch: /meals\.chromium\.spec\.ts/,
      fullyParallel: false,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "meals-chromium-mobile-360",
      testMatch: /meals\.chromium\.spec\.ts/,
      fullyParallel: false,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 780 },
      },
    },
    {
      name: "shopping-chromium-desktop",
      testMatch: /shopping\.chromium\.spec\.ts/,
      fullyParallel: false,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "shopping-chromium-mobile-360",
      testMatch: /shopping\.chromium\.spec\.ts/,
      fullyParallel: false,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 780 },
      },
    },
    {
      name: "webkit-iphone",
      testMatch: /(shell|recipes|meals|shopping)\.webkit\.spec\.ts/,
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "webkit-ipad",
      testMatch: /(shell|recipes|meals|shopping)\.webkit\.spec\.ts/,
      use: { ...devices["iPad Pro 11"] },
    },
  ],
  webServer: {
    command: "npm run start:e2e",
    url: "http://localhost:3000",
    // Budget e2e injects local Supabase env; never reuse a server started with
    // a different .env.local (e.g. hosted keys).
    reuseExistingServer: process.env.PW_REUSE_SERVER === "1",
    timeout: 120_000,
  },
});
