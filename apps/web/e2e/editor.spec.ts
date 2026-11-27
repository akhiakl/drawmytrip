import { addBlankStop, expect, stopMenu, test } from "./fixtures";

test("a removed stop comes back with Undo, and moves are announced", async ({
  page,
}) => {
  await page.goto("/new");
  await addBlankStop(page);
  await page.locator("#stop-0-name").fill("Vienna");
  await addBlankStop(page);
  await page.locator("#stop-1-name").fill("Prague");

  await stopMenu(page, "Vienna", "Move Vienna down");
  await expect(page.getByRole("status").filter({ hasText: "moved" })).toHaveText(
    "Vienna moved to stop 2 of 2.",
  );
  // Focus followed Vienna to the end of the list, onto its menu button.
  await expect(page.locator("#stop-1-menu")).toHaveAccessibleName("More for Vienna");
  await expect(page.locator("#stop-1-menu")).toBeFocused();

  await stopMenu(page, "Prague", "Remove Prague");
  await expect(page.getByText("1 of 5 free stops")).toBeVisible();
  // The toast's Undo, not the top bar's history button.
  await page
    .locator("[data-sonner-toast]")
    .getByRole("button", { name: "Undo" })
    .click();

  await expect(page.getByText("2 of 5 free stops")).toBeVisible();
  await expect(page.locator("#stop-0-menu")).toHaveAccessibleName("More for Prague");
  await expect(page.locator("#stop-1-menu")).toHaveAccessibleName("More for Vienna");
});
