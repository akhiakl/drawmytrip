import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MapAttribution } from "./map-attribution";

describe("MapAttribution", () => {
  it("shows and hides the map credits from one button", async () => {
    const { container } = render(
      <div className="leaflet-container">
        <MapAttribution />
        <div className="leaflet-control-attribution">© OpenStreetMap</div>
      </div>,
    );
    const credits = container.querySelector(".leaflet-control-attribution");
    const toggle = screen.getByRole("button", { name: "Show map credits" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(credits).not.toHaveClass("is-open");

    await userEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Hide map credits" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(credits).toHaveClass("is-open");
  });
});
