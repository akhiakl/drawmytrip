// @vitest-environment node
import { describe, expect, it } from "vitest";

import { formatCompact, formatDateTime, formatDay, formatUsd } from "./format";

describe("format", () => {
  it("compacts only large numbers", () => {
    expect(formatCompact(1234.56)).toBe("1,234.6");
    expect(formatCompact(1_200_000)).toBe("1.2M");
  });
  it("formats dollars", () => {
    expect(formatUsd(1.234)).toBe("$1.23");
    expect(formatUsd(250.4)).toBe("$250");
  });
  it("formats days in UTC and tolerates junk", () => {
    expect(formatDay("2026-11-27")).toBe("Nov 27");
    expect(formatDay("nope")).toBe("nope");
  });
  it("formats a timestamp in UTC", () => {
    expect(formatDateTime(Date.parse("2026-11-27T04:00:00Z"))).toMatch(
      /Nov 27, 2026.*UTC$/,
    );
  });
});
