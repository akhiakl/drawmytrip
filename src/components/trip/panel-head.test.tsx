import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { makeTrip } from "@/test/fixtures/trip";

import { PanelHead } from "./panel-head";

describe("PanelHead", () => {
  it.each(["demo", "shared", "own"] as const)(
    "offers the poster from the sheet's head (%s)",
    async (variant) => {
      const onPoster = vi.fn();
      render(
        <PanelHead
          trip={makeTrip(3)}
          variant={variant}
          view="route"
          onViewChange={vi.fn()}
          onPoster={onPoster}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Poster" }));
      expect(onPoster).toHaveBeenCalledOnce();
    },
  );
});
