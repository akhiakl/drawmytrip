import { expect, test } from "./fixtures";

test("an expired share link lands on the off-the-map page", async ({ page }) => {
  const response = await page.goto("/t/goneCold");
  expect(response?.status()).toBe(404);

  await expect(
    page.getByRole("heading", { name: "This map is off the map" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Plan a new map" }).click();
  await expect(page).toHaveURL(/\/new$/);
});
