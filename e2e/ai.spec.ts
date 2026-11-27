import { makeGeneratedDraft } from "@/test/fixtures/ai";
import { makeSuggestions } from "@/test/fixtures/suggest";

import { expect, test, type Page } from "./fixtures";

/** Suggestions fail unless a test says otherwise: the chat then builds at once. */
async function mockSuggest(
  page: Page,
  suggestions?: ReturnType<typeof makeSuggestions>,
) {
  await page.route("**/api/suggest", (route) =>
    suggestions
      ? route.fulfill({ json: suggestions })
      : route.fulfill({ status: 502, json: { error: "suggestions_failed" } }),
  );
}

/** Walks the /plan chat with the generator mocked to return `draft`. */
async function planWithAi(page: Page, draft: ReturnType<typeof makeGeneratedDraft>) {
  await mockSuggest(page);
  await page.route("**/api/generate", (route) => route.fulfill({ json: draft }));
  await page.goto("/plan");
  await page.getByLabel("Destination").fill("Austria");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Number of days").fill("6");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: /Balanced/ }).click();
  await expect(page).toHaveURL(/\/new/);
}

test("AI create flow prefills the editor", async ({ page }) => {
  await planWithAi(page, makeGeneratedDraft([], 3));

  await expect(page.getByLabel("Trip title")).toHaveValue("Alpine Arc");
  await expect(page.getByText("3 of 5 free stops")).toBeVisible();
  await expect(page.getByText("Stop 3").first()).toBeVisible();
});

test("a ghost stop past the guest limit opens the upsell", async ({ page }) => {
  await planWithAi(page, makeGeneratedDraft(["Ljubljana"], 5));

  await expect(page.getByText("5 of 5 free stops")).toBeVisible();
  await page
    .locator(".marker-ghost", { hasText: "Ljubljana" })
    .locator(".marker-dot")
    .click();
  await expect(page.getByRole("dialog", { name: "5 stops, for now" })).toBeVisible();
});

/** Answers the chat for Toronto up to the picker; returns what /api/generate got. */
async function toTheTorontoPicker(
  page: Page,
  draft: ReturnType<typeof makeGeneratedDraft>,
) {
  const bodies: unknown[] = [];
  await mockSuggest(page, makeSuggestions("city"));
  await page.route("**/api/generate", (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({ json: draft });
  });
  await page.goto("/plan");
  await page.getByLabel("Destination").fill("Toronto");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Number of days").fill("5");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: /Balanced/ }).click();
  return bodies;
}

test("a single city offers places to pick and builds a one-city trip", async ({
  page,
}) => {
  const draft = makeGeneratedDraft([], 1);
  const bodies = await toTheTorontoPicker(page, draft);

  await expect(page.getByRole("group", { name: "Must see" })).toBeVisible();
  await expect(page.getByRole("button", { name: "CN Tower" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Kensington Market" }).click();
  await page.getByRole("button", { name: "Build my route" }).click();

  await expect(page).toHaveURL(/\/new/);
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toMatchObject({
    destination: "Toronto",
    days: 5,
    scope: "city",
  });
  expect(
    (bodies[0] as { picks: { name: string }[] }).picks.map((p) => p.name),
  ).not.toContain("Kensington Market");
  await expect(page.getByText("1 of 5 free stops")).toBeVisible();
});

test("Surprise me skips the picks", async ({ page }) => {
  const bodies = await toTheTorontoPicker(page, makeGeneratedDraft([], 2));

  await page.getByRole("button", { name: "Surprise me" }).click();

  await expect(page).toHaveURL(/\/new/);
  expect(bodies[0]).toEqual({ destination: "Toronto", days: 5, vibe: "balanced" });
});

test("a region offers only cities", async ({ page }) => {
  await mockSuggest(page, makeSuggestions("region"));
  await page.route("**/api/generate", (route) =>
    route.fulfill({ json: makeGeneratedDraft([], 2) }),
  );
  await page.goto("/plan?destination=Austria");
  await page.getByRole("button", { name: "2 weeks" }).click();
  await page.getByRole("button", { name: /Balanced/ }).click();

  await expect(page.getByRole("group", { name: "Cities" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Must see" })).toHaveCount(0);
});
