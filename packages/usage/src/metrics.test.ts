import { describe, expect, it } from "vitest";

import {
  COUNTER_METRICS,
  GAUGE_METRICS,
  dateKey,
  emptyDay,
  parseDay,
  usageKey,
} from "./metrics";
import { makeDailyUsage } from "../test/fixtures";

describe("dateKey", () => {
  it("uses the UTC day, not the local one", () => {
    expect(dateKey(new Date("2026-11-27T23:59:59Z"))).toBe("2026-11-27");
    expect(dateKey(new Date("2026-11-28T00:00:00Z"))).toBe("2026-11-28");
  });

  it("prefixes the Redis key", () => {
    expect(usageKey(new Date("2026-01-05T10:00:00Z"))).toBe("usage:2026-01-05");
  });
});

describe("emptyDay", () => {
  it("zeroes every metric", () => {
    const day = emptyDay("2026-11-27");
    expect(day.date).toBe("2026-11-27");
    for (const metric of [...COUNTER_METRICS, ...GAUGE_METRICS])
      expect(day[metric]).toBe(0);
  });
});

describe("parseDay", () => {
  it("zero-fills a missing hash", () => {
    expect(parseDay("2026-11-27", null)).toEqual(makeDailyUsage());
  });

  it("reads numeric and numeric-string fields and ignores junk", () => {
    const day = parseDay("2026-11-27", {
      ai_generations: "4",
      map_views: 12,
      ai_failures: "oops",
      unknown_field: 9,
    });
    expect(day).toEqual(makeDailyUsage({ ai_generations: 4, map_views: 12 }));
  });
});
