import { describe, expect, it } from "vitest";

import { HealthReportSchema, summarize } from "./schema";
import { makeHealthReport, makeServiceCheck } from "../test/fixtures";

describe("HealthReportSchema", () => {
  it("accepts a report and rejects an unknown status", () => {
    expect(HealthReportSchema.safeParse(makeHealthReport()).success).toBe(true);
    const bad = { ...makeHealthReport(), services: [{ id: "redis", status: "maybe" }] };
    expect(HealthReportSchema.safeParse(bad).success).toBe(false);
  });
});

describe("summarize", () => {
  it("is ok when nothing is down, counting missing settings", () => {
    expect(
      summarize([
        makeServiceCheck(),
        makeServiceCheck({ id: "sentry", status: "configured" }),
        makeServiceCheck({ id: "vercel", status: "not_configured" }),
      ]),
    ).toEqual({ status: "ok", down: 0, notConfigured: 1 });
  });

  it("is degraded when one probe is down", () => {
    expect(summarize([makeServiceCheck({ status: "down" })])).toEqual({
      status: "degraded",
      down: 1,
      notConfigured: 0,
    });
  });
});
