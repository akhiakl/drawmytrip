import AxeBuilder from "@axe-core/playwright";
import { test as plain, expect as plainExpect } from "@playwright/test";

import { CRON_SECRET } from "./env";
import { expect, seedUsage, test } from "./fixtures";

test.beforeAll(async () => seedUsage());

plain.describe("signed out", () => {
  plain("pages send you to sign-in", async ({ page }) => {
    await page.goto("/usage");
    await plainExpect(page).toHaveURL(/\/sign-in$/);
    await plainExpect(
      page.getByRole("link", { name: "Sign in with GitHub" }),
    ).toHaveAttribute("href", "/api/auth/login");
  });

  plain("a forged cookie is refused", async ({ page, baseURL }) => {
    await page
      .context()
      .addCookies([
        { name: "dmt_admin", value: "forged.token.value", url: baseURL! },
      ]);
    await page.goto("/limits");
    await plainExpect(page).toHaveURL(/\/sign-in$/);
  });

  plain("collect needs the cron secret, health is open", async ({ request }) => {
    plainExpect((await request.get("/api/collect")).status()).toBe(401);
    plainExpect((await request.get("/api/health")).status()).toBe(200);
    const ok = await request.get("/api/collect", {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    plainExpect(ok.status()).toBe(200);
  });
});

test.describe("signed in", () => {
  test("overview leads with status, KPIs and recent activity", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Overview", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Key numbers" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recent activity" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "DrawMyTrip Admin" })).toBeVisible();
    await page.getByRole("link", { name: "See all usage" }).click();
    await expect(page).toHaveURL(/\/usage$/);
  });

  test("usage shows headroom meters, KPIs and charts", async ({ page }) => {
    await page.goto("/usage");
    await expect(
      page.getByRole("heading", { name: "Usage", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Free-tier headroom this month" }),
    ).toBeVisible();
    await expect(
      page.getByRole("meter", { name: "LLM requests per day" }),
    ).toBeVisible();
    await expect(page.getByText("AI plans").first()).toBeVisible();
    await expect(page.locator("[data-slot=chart]").first()).toBeVisible();
    await page.getByRole("link", { name: "7 days" }).click();
    await expect(page).toHaveURL(/range=7/);
  });

  test("saving limits persists and is audited", async ({ page }) => {
    await page.goto("/limits");
    const field = page.getByLabel("AI plans per visitor per hour");
    await field.fill("9");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Limits saved")).toBeVisible();
    await page.reload();
    await expect(field).toHaveValue("9");
    await page.goto("/audit");
    await expect(page.getByText("guest.aiPerHour: 5 → 9")).toBeVisible();
  });

  test("an out-of-range value is flagged, not saved", async ({ page }) => {
    await page.goto("/limits");
    await page.getByLabel("AI plans per visitor per hour").fill("999");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Check the highlighted fields.")).toBeVisible();
  });

  test("health lists the site and console services with setup hints", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Health" }).first().click();
    await expect(
      page.getByRole("heading", { name: "Health", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Site" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Console" })).toBeVisible();
    // No shared secret in e2e: the site row asks for it.
    await expect(page.getByText(/Set HEALTH_CHECK_SECRET/)).toBeVisible();
    await expect(
      page
        .getByRole("listitem")
        .filter({ hasText: "Console store" })
        .getByText("Up", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Check again" }).click();
    await expect(page.getByRole("button", { name: "Check again" })).toBeVisible();
  });

  test("sign out returns to sign-in", async ({ page }) => {
    await page.goto("/usage");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goto("/usage");
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  for (const path of ["/", "/usage", "/limits", "/health", "/audit"]) {
    for (const colorScheme of ["light", "dark"] as const) {
      test(`${path} has no axe violations or sideways scroll (${colorScheme})`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(violations).toEqual([]);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  }
});
