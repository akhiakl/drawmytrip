import { defineConfig, devices } from "@playwright/test";

import { ADMIN_ID, CRON_SECRET, FAKE_UPSTASH_PORT, SESSION_SECRET } from "./e2e/env";

const PORT = 3001;

/**
 * Admin journeys against a production build (`pnpm build` first). Upstash is
 * the web app's in-memory REST stub; GitHub sign-in is not exercised end to
 * end (specs mint a signed session cookie instead).
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH },
  },
  webServer: [
    {
      command: "node ../web/e2e/fake-upstash.ts",
      port: FAKE_UPSTASH_PORT,
      env: { FAKE_UPSTASH_PORT: String(FAKE_UPSTASH_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm start`,
      port: PORT,
      env: {
        UPSTASH_REDIS_REST_URL: `http://127.0.0.1:${FAKE_UPSTASH_PORT}`,
        UPSTASH_REDIS_REST_TOKEN: "e2e",
        ADMIN_GITHUB_CLIENT_ID: "e2e-client",
        ADMIN_GITHUB_CLIENT_SECRET: "e2e-secret",
        ADMIN_GITHUB_IDS: String(ADMIN_ID),
        ADMIN_SESSION_SECRET: SESSION_SECRET,
        CRON_SECRET,
      },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
