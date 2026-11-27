// @vitest-environment node
import { describe, expect, it } from "vitest";

import { makeDayPoint, makeMeter } from "@/test/fixtures/admin";

import { headlineOf, kpiChange, kpiSeries, kpiTone, sparkPath } from "./dashboard";

describe("headlineOf", () => {
  it("names the most urgent connected meter", () => {
    const headline = headlineOf([
      makeMeter({ id: "vercel_cpu", status: "watch" }),
      makeMeter({ id: "upstash_commands", status: "critical" }),
      makeMeter({ id: "vercel_events", status: "critical", connected: false }),
    ]);
    expect(headline).toEqual({
      status: "critical",
      meterId: "upstash_commands",
      connected: 2,
      total: 3,
    });
  });

  it("is on track with no meter to name when every live meter is fine", () => {
    expect(headlineOf([makeMeter(), makeMeter({ connected: false })])).toEqual({
      status: "ok",
      meterId: null,
      connected: 1,
      total: 2,
    });
  });

  it("is unknown when nothing is connected", () => {
    expect(headlineOf([makeMeter({ connected: false })]).status).toBe("unknown");
    expect(headlineOf([]).status).toBe("unknown");
  });
});

describe("kpiChange and kpiTone", () => {
  it("rounds the change and needs a previous period", () => {
    expect(kpiChange({ id: "map_views", value: 150, previous: 100 })).toBe(50);
    expect(kpiChange({ id: "map_views", value: 5, previous: 0 })).toBeNull();
  });

  it("reads growth as bad only for spend and refusals", () => {
    expect(kpiTone("map_views", 10)).toBe("good");
    expect(kpiTone("map_views", -10)).toBe("bad");
    expect(kpiTone("cost_usd", 10)).toBe("bad");
    expect(kpiTone("provider_429", -10)).toBe("good");
    expect(kpiTone("tokens", 0)).toBe("flat");
    expect(kpiTone("map_views", -4)).toBe("flat");
    expect(kpiTone("tokens", null)).toBe("flat");
  });
});

describe("kpiSeries", () => {
  it("picks each KPI's daily figure", () => {
    const days = [
      makeDayPoint({ promptTokens: 3, completionTokens: 2, mapViews: 7 }),
      makeDayPoint({ promptTokens: 1, completionTokens: 1, mapViews: 9 }),
    ];
    expect(kpiSeries("tokens", days)).toEqual([5, 2]);
    expect(kpiSeries("map_views", days)).toEqual([7, 9]);
  });
});

describe("sparkPath", () => {
  it("spans the box, highest value at the top", () => {
    expect(sparkPath([0, 10], 100, 24)).toBe("M0.0 22.0 L100.0 2.0");
  });

  it("draws a flat series mid-low and nothing for one point", () => {
    expect(sparkPath([4, 4], 10, 24)).toBe("M0.0 22.0 L10.0 22.0");
    expect(sparkPath([4], 10, 24)).toBe("");
  });
});
