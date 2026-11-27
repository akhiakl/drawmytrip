import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { makeLeg } from "@/test/fixtures/trip";

import { LegRow } from "./leg-row";

describe("LegRow", () => {
  it("rests as a one-line summary that opens its fields", async () => {
    render(
      <LegRow
        leg={makeLeg({ mode: "train", duration: "~2h 40m" })}
        index={0}
        km={250}
        onChange={vi.fn()}
      />,
    );
    const toggle = screen.getByRole("button", { name: /Train · ~2h 40m/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Duration")).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Duration")).toHaveValue("~2h 40m");
  });

  it("offers the mode's estimate for the distance and applies it", async () => {
    const onChange = vi.fn();
    render(
      <LegRow
        leg={makeLeg({ duration: "" })}
        index={0}
        km={250}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText(/as the crow flies/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /use estimate/i }));
    expect(onChange).toHaveBeenCalledWith({ duration: "~3h 30m" });
  });

  it("hides the estimate until both stops are placed", async () => {
    render(<LegRow leg={makeLeg()} index={0} km={null} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.queryByText(/as the crow flies/)).not.toBeInTheDocument();
  });
});
