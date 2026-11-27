import { addBlankStop, expect, test } from "./fixtures";

test("the editor stops at 5 cities and offers the upsell", async ({ page }) => {
  await page.goto("/new");
  for (let i = 0; i < 5; i++) await addBlankStop(page);

  await expect(page.getByText("5 of 5 free stops")).toBeVisible();

  // Past the limit, Add stop opens the upsell instead of the search.
  await page.getByRole("button", { name: "Add stop", exact: true }).click();
  const upsell = page.getByRole("dialog", { name: "5 stops, for now" });
  await expect(upsell).toBeVisible();
  await expect(page.getByPlaceholder("Search for a city…")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(upsell).toBeHidden();

  await page.getByRole("button", { name: "See what unlocks" }).click();
  await expect(upsell).toBeVisible();
});
