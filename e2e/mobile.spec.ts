import { expect, test } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test.describe("trip panel (mobile sheet)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("rests on the title with actions in the bar, opens on the handle, lowers on a map tap", async ({
    page,
  }) => {
    const handle = page.getByRole("button", { name: /trip details/i });
    await expect(handle).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("link", { name: "Plan with AI" })).toBeInViewport();
    // The itinerary waits below the fold, out of the tab order.
    await expect(page.getByRole("list", { name: "Itinerary" })).not.toBeInViewport();

    await handle.click();
    await expect(handle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Nights", { exact: true })).toBeInViewport();

    // Open map between the top bar and the raised sheet.
    await page.mouse.click(40, 290);
    await expect(handle).toHaveAttribute("aria-expanded", "false");
  });

  test("a marker tap opens the stop in the sheet", async ({ page }) => {
    await page.locator(".marker", { hasText: "Paris" }).locator(".marker-dot").tap();

    await expect(
      page.getByRole("button", { name: /trip details/i }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByRole("heading", { level: 2, name: "Paris" }),
    ).toBeInViewport();
  });
});
