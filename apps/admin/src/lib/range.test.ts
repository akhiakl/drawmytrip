import { describe, expect, it } from "vitest";

import { parseRange } from "./range";

describe("parseRange", () => {
  it.each([
    ["7", 7],
    ["30", 30],
    ["90", 90],
  ])("accepts %s", (value, expected) => {
    expect(parseRange(value)).toBe(expected);
  });

  it.each([undefined, "", "14", "abc", "-7"])("defaults for %s", (value) => {
    expect(parseRange(value)).toBe(30);
  });
});
