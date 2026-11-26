import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageBar } from "./page-bar";

describe("PageBar", () => {
  it("leads a task page with a way home and its name", () => {
    render(<PageBar title="My maps" />);
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "My maps" }),
    ).toBeInTheDocument();
  });

  it("carries the logo home when it has no title", () => {
    render(<PageBar />);
    expect(
      screen.queryByRole("link", { name: "Back to home" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/");
  });
});
