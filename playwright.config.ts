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
      name: "webkit-iphone",
      testMatch: /shell\.webkit\.spec\.ts/,
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "webkit-ipad",
      testMatch: /shell\.webkit\.spec\.ts/,
      use: { ...devices["iPad Pro 11"] },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
