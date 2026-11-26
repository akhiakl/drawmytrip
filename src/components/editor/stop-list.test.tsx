import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeCity, makeLeg } from "@/test/fixtures/trip";

import { StopList } from "./stop-list";

const props = {
  keys: ["a", "b", "c", "d", "e"],
  onRemoveCity: vi.fn(),
  onMoveCity: vi.fn(),
  onUpdateCity: vi.fn(),
  onUpdateLeg: vi.fn(),
  onLimitReached: vi.fn(),
};

/** Picks an item from a stop's "More for …" menu. */
async function pick(stop: string, item: string) {
  await userEvent.click(screen.getByRole("button", { name: `More for ${stop}` }));
  await userEvent.click(await screen.findByRole("menuitem", { name: item }));
}

const two = () => [makeCity({ name: "Vienna" }), makeCity({ name: "Prague" })];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StopList", () => {
  it("renders one compact row per city and a leg between consecutive stops", () => {
    render(<StopList {...props} cities={two()} legs={[makeLeg()]} canAddCity />);

    expect(screen.getByText("Vienna")).toBeInTheDocument();
    expect(screen.getByText("Prague")).toBeInTheDocument();
    expect(screen.getAllByRole("group", { name: /^Nights in/ })).toHaveLength(2);
  });

  it("removes a stop from its menu", async () => {
    render(<StopList {...props} cities={two()} legs={[makeLeg()]} canAddCity />);

    await pick("Vienna", "Remove Vienna");
    expect(props.onRemoveCity).toHaveBeenCalledWith(0);
  });

  it("moves a stop up and down from its menu", async () => {
    render(<StopList {...props} cities={two()} legs={[makeLeg()]} canAddCity />);

    await pick("Prague", "Move Prague up");
    expect(props.onMoveCity).toHaveBeenCalledWith(1, 0);

    await pick("Vienna", "Move Vienna down");
    expect(props.onMoveCity).toHaveBeenCalledWith(0, 1);
  });

  it("announces where a moved stop went", async () => {
    render(<StopList {...props} cities={two()} legs={[makeLeg()]} canAddCity />);

    await pick("Prague", "Move Prague up");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Prague moved to stop 1 of 2.",
    );
  });

  it("disables moves past the ends of the list", async () => {
    render(<StopList {...props} cities={two()} legs={[makeLeg()]} canAddCity />);

    await userEvent.click(screen.getByRole("button", { name: "More for Vienna" }));
    expect(
      await screen.findByRole("menuitem", { name: "Move Vienna up" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("steps nights with the stepper, within range", async () => {
    render(
      <StopList
        {...props}
        cities={[makeCity({ name: "Vienna", nights: 0 })]}
        legs={[]}
        canAddCity
      />,
    );

    expect(
      screen.getByRole("button", { name: "Fewer nights in Vienna" }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "More nights in Vienna" }),
    );
    expect(props.onUpdateCity).toHaveBeenLastCalledWith(0, { nights: 1 });
  });

  it("marks the stop being edited as active", async () => {
    const onActivate = vi.fn();
    render(
      <StopList
        {...props}
        cities={two()}
        legs={[makeLeg()]}
        canAddCity
        onActivate={onActivate}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "More nights in Prague" }),
    );
    expect(onActivate).toHaveBeenCalledWith(1);
  });

  it("shows the guest-limit prompt once at the ceiling", async () => {
    render(<StopList {...props} cities={[]} legs={[]} canAddCity={false} />);

    await userEvent.click(screen.getByRole("button", { name: "See what unlocks" }));
    expect(props.onLimitReached).toHaveBeenCalledOnce();
  });

  it("opens a stop's details from its menu", async () => {
    const cities = [makeCity({ name: "Vienna", why: "Coffee houses" })];
    render(<StopList {...props} cities={cities} legs={[]} canAddCity />);

    expect(screen.queryByDisplayValue("Coffee houses")).not.toBeInTheDocument();
    await pick("Vienna", "Edit all details");
    expect(screen.getByDisplayValue("Vienna")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Coffee houses")).toBeInTheDocument();
  });

  it("keeps the open details on their stop after a reorder", async () => {
    const vienna = makeCity({ name: "Vienna", why: "Coffee houses" });
    const prague = makeCity({ name: "Prague", why: "Castle district" });
    const { rerender } = render(
      <StopList
        {...props}
        cities={[vienna, prague]}
        legs={[makeLeg()]}
        canAddCity
      />,
    );

    await pick("Vienna", "Edit all details");
    await pick("Vienna", "Move Vienna down");
    rerender(
      <StopList
        {...props}
        cities={[prague, vienna]}
        legs={[makeLeg()]}
        canAddCity
      />,
    );

    expect(screen.getByDisplayValue("Coffee houses")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Castle district")).not.toBeInTheDocument();
  });

  it("closes the details when their stop is removed", async () => {
    const vienna = makeCity({ name: "Vienna", why: "Coffee houses" });
    const prague = makeCity({ name: "Prague", why: "Castle district" });
    const { rerender } = render(
      <StopList
        {...props}
        cities={[vienna, prague]}
        legs={[makeLeg()]}
        canAddCity
      />,
    );

    await pick("Vienna", "Edit all details");
    await pick("Vienna", "Remove Vienna");
    rerender(<StopList {...props} cities={[prague]} legs={[]} canAddCity />);

    expect(screen.queryByDisplayValue("Castle district")).not.toBeInTheDocument();
  });

  it("opens a nameless stop's fields and links errors to them", () => {
    const cities = [makeCity({ name: "" }), makeCity({ name: "Prague" })];
    render(
      <StopList
        {...props}
        cities={cities}
        legs={[makeLeg()]}
        canAddCity
        issues={{
          "cities.0.name": "nameRequired",
          "cities.1.nights": "nightsRange",
        }}
      />,
    );

    const name = screen.getByLabelText("City");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Give this stop a name.");
    expect(
      screen.getByRole("group", { name: "Nights in Prague" }),
    ).toHaveAccessibleDescription("Nights run from 0 to 30.");
  });

  it("keeps a blank stop's fields open while its name is typed", async () => {
    const { rerender } = render(
      <StopList {...props} cities={[makeCity({ name: "" })]} legs={[]} canAddCity />,
    );

    await userEvent.click(screen.getByLabelText("City"));
    rerender(
      <StopList
        {...props}
        cities={[makeCity({ name: "V" })]}
        legs={[]}
        canAddCity
      />,
    );
    expect(screen.getByLabelText("City")).toHaveFocus();
  });

  describe("keyboard focus", () => {
    it("lands on the menu of the stop that slid into a removed stop's place", async () => {
      render(<StopList {...props} cities={two()} legs={[makeLeg()]} canAddCity />);
      await pick("Vienna", "Remove Vienna");
      await waitFor(() =>
        expect(document.getElementById("stop-0-menu")).toHaveFocus(),
      );
    });

    it("follows a moved stop to its menu button", async () => {
      const cities = two();
      const { rerender } = render(
        <StopList {...props} cities={cities} legs={[makeLeg()]} canAddCity />,
      );
      await pick("Prague", "Move Prague up");
      rerender(
        <StopList
          {...props}
          cities={[cities[1], cities[0]]}
          legs={[makeLeg()]}
          canAddCity
        />,
      );
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "More for Prague" }),
        ).toHaveFocus(),
      );
    });
  });
});
