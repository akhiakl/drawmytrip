import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeCandidate, makePick, makeSuggestions } from "@/test/fixtures/suggest";

import { PickStep } from "./pick-step";

const trackEvent = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ trackEvent }));

beforeEach(() => trackEvent.mockClear());

const city = makeSuggestions("city");
const region = makeSuggestions("region");
const chip = (name: string) => screen.getByRole("button", { name });

describe("PickStep", () => {
  it("groups a city's places and hides empty groups", () => {
    render(
      <PickStep
        suggestions={city}
        initial={[]}
        onBuild={vi.fn()}
        onSurprise={vi.fn()}
      />,
    );
    for (const label of [
      "Must see",
      "Lesser known",
      "Food and neighbourhoods",
      "Day trips",
    ]) {
      expect(screen.getByRole("group", { name: label })).toBeVisible();
    }
    expect(screen.queryByRole("group", { name: "Cities" })).not.toBeInTheDocument();
  });

  it("shows only cities for a region", () => {
    render(
      <PickStep
        suggestions={region}
        initial={[]}
        onBuild={vi.fn()}
        onSurprise={vi.fn()}
      />,
    );
    expect(screen.getByRole("group", { name: "Cities" })).toBeVisible();
    expect(
      screen.queryByRole("group", { name: "Must see" }),
    ).not.toBeInTheDocument();
  });

  it("presses the preselected chips and counts them", () => {
    render(
      <PickStep
        suggestions={city}
        initial={[
          makePick(),
          makePick({ name: "Distillery District", kind: "gem" }),
        ]}
        onBuild={vi.fn()}
        onSurprise={vi.fn()}
      />,
    );
    expect(chip("CN Tower")).toHaveAttribute("aria-pressed", "true");
    expect(chip("Niagara Falls")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("2 of 12 picked")).toBeInTheDocument();
  });

  it("toggles a chip and builds the picks in group order", async () => {
    const user = userEvent.setup();
    const onBuild = vi.fn();
    render(
      <PickStep
        suggestions={city}
        initial={[makePick({ name: "Niagara Falls", kind: "daytrip" })]}
        onBuild={onBuild}
        onSurprise={vi.fn()}
      />,
    );
    await user.click(chip("Kensington Market"));
    await user.click(chip("CN Tower"));
    await user.click(screen.getByRole("button", { name: "Build my route" }));
    expect(onBuild).toHaveBeenCalledWith([
      { name: "CN Tower", kind: "sight" },
      { name: "Kensington Market", kind: "food" },
      { name: "Niagara Falls", kind: "daytrip" },
    ]);
  });

  it("disables Build with nothing picked", async () => {
    const user = userEvent.setup();
    render(
      <PickStep
        suggestions={city}
        initial={[makePick()]}
        onBuild={vi.fn()}
        onSurprise={vi.fn()}
      />,
    );
    await user.click(chip("CN Tower"));
    expect(screen.getByRole("button", { name: "Build my route" })).toBeDisabled();
  });

  it("calls onSurprise", async () => {
    const onSurprise = vi.fn();
    render(
      <PickStep
        suggestions={city}
        initial={[]}
        onBuild={vi.fn()}
        onSurprise={onSurprise}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Surprise me" }));
    expect(onSurprise).toHaveBeenCalledTimes(1);
  });

  it("stops a city at twelve picks and says why", async () => {
    const many = makeSuggestions("city", {
      candidates: Array.from({ length: 14 }, (_, i) =>
        makeCandidate({ name: `Place ${i}` }),
      ),
    });
    const initial = many.candidates
      .slice(0, 12)
      .map(({ name, kind }) => ({ name, kind }));
    render(
      <PickStep
        suggestions={many}
        initial={initial}
        onBuild={vi.fn()}
        onSurprise={vi.fn()}
      />,
    );

    await userEvent.click(chip("Place 12"));
    expect(chip("Place 12")).toHaveAttribute("aria-pressed", "false");
    expect(chip("Place 12")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      "most places for one trip (12)",
    );
    // Unpicking frees a slot.
    await userEvent.click(chip("Place 0"));
    await userEvent.click(chip("Place 12"));
    expect(chip("Place 12")).toHaveAttribute("aria-pressed", "true");
  });

  it("stops a region at five cities and opens the upsell", async () => {
    const six = makeSuggestions("region", {
      candidates: Array.from({ length: 6 }, (_, i) =>
        makeCandidate({ name: `City ${i}`, kind: "city" }),
      ),
    });
    const initial = six.candidates
      .slice(0, 5)
      .map(({ name, kind }) => ({ name, kind }));
    render(
      <PickStep
        suggestions={six}
        initial={initial}
        onBuild={vi.fn()}
        onSurprise={vi.fn()}
      />,
    );

    await userEvent.click(chip("City 5"));
    // The open dialog hides the page behind it from the accessibility tree.
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "City 5", hidden: true }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent(
      "5-city limit",
    );
    expect(trackEvent).toHaveBeenCalledWith("upsell_shown");
  });

  it("reports that suggestions were shown once", () => {
    render(
      <PickStep
        suggestions={city}
        initial={[]}
        onBuild={vi.fn()}
        onSurprise={vi.fn()}
      />,
    );
    expect(trackEvent).toHaveBeenCalledWith("ai_suggestions_shown");
  });
});
