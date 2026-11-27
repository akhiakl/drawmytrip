import { describe, expect, it } from "vitest";

import {
  daysUntilLimit,
  mean,
  projectMonthEnd,
  remainingDaysUtc,
  statusFor,
} from "./forecast";

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("remainingDaysUtc", () => {
  it.each([
    ["2026-11-27", 3], // 30-day month
    ["2026-12-31", 0], // month's last day
    ["2026-01-01", 30], // 31-day month
    ["2026-02-10", 18], // 28-day month
    ["2028-02-10", 19], // leap February
  ])("%s has %i days left", (iso, expected) => {
    expect(remainingDaysUtc(day(iso))).toBe(expected);
  });

  it("counts by UTC even near midnight", () => {
    expect(remainingDaysUtc(new Date("2026-11-30T23:59:59Z"))).toBe(0);
  });
});

describe("projectMonthEnd", () => {
  it("adds the recent daily average for every remaining day", () => {
    expect(projectMonthEnd(100, [10, 20, 30], day("2026-11-27"))).toBe(100 + 20 * 3);
  });

  it("is the month to date when there is no history", () => {
    expect(projectMonthEnd(100, [], day("2026-11-27"))).toBe(100);
  });

  it("is the month to date on the last day", () => {
    expect(projectMonthEnd(100, [50], day("2026-11-30"))).toBe(100);
  });
});

describe("mean", () => {
  it("is 0 for no values", () => {
    expect(mean([])).toBe(0);
  });
});

describe("daysUntilLimit", () => {
  it("is 0 at or over the limit", () => {
    expect(daysUntilLimit(100, 5, 100)).toBe(0);
    expect(daysUntilLimit(120, 5, 100)).toBe(0);
  });

  it("is null when usage is not growing", () => {
    expect(daysUntilLimit(10, 0, 100)).toBeNull();
  });

  it("rounds up to whole days", () => {
    expect(daysUntilLimit(10, 20, 100)).toBe(5);
    expect(daysUntilLimit(10, 25, 100)).toBe(4);
  });
});

describe("statusFor", () => {
  it.each([
    [null, "unknown"],
    [0, "ok"],
    [0.69, "ok"],
    [0.7, "watch"],
    [0.89, "watch"],
    [0.9, "critical"],
    [2, "critical"],
  ] as const)("ratio %s is %s", (ratio, expected) => {
    expect(statusFor(ratio)).toBe(expected);
  });
});
