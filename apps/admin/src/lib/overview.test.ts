import { makeRuntimeConfig } from "@drawmytrip/runtime-config/fixtures";
import { describe, expect, it } from "vitest";

import {
  makeMonthSnapshot,
  makeSnapshot,
  makeUsageDays,
} from "@/test/fixtures/admin";

import { buildUsageOverview } from "./overview";

const TODAY = new Date("2026-11-27T12:00:00Z");
const config = makeRuntimeConfig();

const build = (overrides: Partial<Parameters<typeof buildUsageOverview>[0]> = {}) =>
  buildUsageOverview({
    range: 7,
    usage: makeUsageDays(14, "2026-11-27"),
    snapshots: {},
    config,
    today: TODAY,
    ...overrides,
  });

const meter = (overview: ReturnType<typeof build>, id: string) =>
  overview.meters.find((m) => m.id === id)!;

describe("provider meters", () => {
  it("projects month end at the recent daily rate and judges it against the limit", () => {
    const overview = build({
      snapshots: { vercel: makeMonthSnapshot("vercel", "transfer_gb", 3) },
    });
    expect(meter(overview, "vercel_transfer")).toMatchObject({
      used: 81,
      projected: 90,
      limit: 100,
      ratio: 0.9,
      status: "critical",
      daysLeft: 7,
      connected: true,
    });
  });

  it("marks a provider that is missing or not ok as not connected", () => {
    const overview = build({
      snapshots: {
        vercel: makeSnapshot("vercel", { status: "not_configured" }),
        upstash: makeSnapshot("upstash", { status: "unavailable" }),
      },
    });
    for (const id of ["vercel_transfer", "upstash_commands", "upstash_storage"]) {
      expect(meter(overview, id)).toMatchObject({
        connected: false,
        used: 0,
        projected: null,
        ratio: null,
        status: "unknown",
        daysLeft: null,
      });
    }
    expect(build().meters.find((m) => m.id === "vercel_cpu")?.connected).toBe(false);
  });

  it("reads storage as a level with nothing projected", () => {
    const overview = build({
      snapshots: {
        upstash: makeSnapshot("upstash", { current: { storage_mb: 200 } }),
      },
    });
    expect(meter(overview, "upstash_storage")).toMatchObject({
      used: 200,
      projected: 200,
      ratio: 200 / 256,
      status: "watch",
      daysLeft: null,
    });
  });

  it("falls back to a monthly command total when there are no daily values", () => {
    const overview = build({
      snapshots: {
        upstash: makeSnapshot("upstash", { current: { commands_month: 270_000 } }),
      },
    });
    expect(meter(overview, "upstash_commands")).toMatchObject({
      used: 270_000,
      projected: 270_000 + 10_000 * 3,
      daysLeft: 23,
    });
  });

  it("does not use the monthly total for other metrics", () => {
    const overview = build({
      snapshots: {
        vercel: makeSnapshot("vercel", { current: { commands_month: 5 } }),
      },
    });
    expect(meter(overview, "vercel_transfer")).toMatchObject({
      used: 0,
      projected: 0,
    });
  });
});

describe("llm meter", () => {
  const usage = (calls: number[], limit = 0) =>
    makeUsageDays(calls.length, "2026-11-27", (i) => ({
      ai_model_calls: calls[i],
      ai_rpd_limit: limit,
    }));

  it("takes the busiest of the last 7 days and the provider's reported limit", () => {
    const overview = build({ usage: usage([500, 1, 2, 3, 400, 5, 6, 7, 8], 1000) });
    expect(meter(overview, "llm_requests_day")).toMatchObject({
      used: 400,
      limit: 1000,
      ratio: 0.4,
      status: "ok",
      connected: true,
    });
  });

  it("falls back to the configured limit, then to no limit", () => {
    const calls = [10, 20];
    const configured = build({
      usage: usage(calls),
      config: makeRuntimeConfig({ freeTier: { llmRequestsPerDay: 40 } }),
    });
    expect(meter(configured, "llm_requests_day")).toMatchObject({
      limit: 40,
      ratio: 0.5,
    });

    const none = build({ usage: usage(calls) });
    expect(meter(none, "llm_requests_day")).toMatchObject({
      limit: null,
      ratio: null,
      status: "unknown",
    });
  });

  it("uses the latest reported limit", () => {
    const days = makeUsageDays(3, "2026-11-27", (i) => ({
      ai_model_calls: 10,
      ai_rpd_limit: [1000, 2000, 0][i],
    }));
    expect(meter(build({ usage: days }), "llm_requests_day").limit).toBe(2000);
  });
});

describe("meter order", () => {
  it("puts critical first, then watch, ok and unknown", () => {
    const overview = build({
      snapshots: {
        vercel: makeMonthSnapshot("vercel", "transfer_gb", 3),
        upstash: makeSnapshot("upstash", { current: { storage_mb: 200 } }),
      },
    });
    expect(overview.meters.map((m) => [m.id, m.status])).toEqual([
      ["vercel_transfer", "critical"],
      ["upstash_storage", "watch"],
      ["vercel_cpu", "ok"],
      ["vercel_events", "ok"],
      ["upstash_commands", "ok"],
      ["llm_requests_day", "unknown"],
    ]);
  });

  it("orders equal statuses by ratio, highest first", () => {
    const overview = build({
      snapshots: {
        vercel: makeMonthSnapshot("vercel", "cpu_hours", 0.05),
      },
    });
    expect(overview.meters[0].id).toBe("vercel_cpu");
  });
});

describe("days", () => {
  const config = makeRuntimeConfig({
    ai: { inputUsdPerMTokens: 1, outputUsdPerMTokens: 3 },
  });

  it("covers the last `range` days with cost rounded to cents", () => {
    const usage = makeUsageDays(14, "2026-11-27", {
      ai_prompt_tokens: 1_234_567,
      ai_completion_tokens: 654_321,
      ai_refused_disabled: 1,
      trips_refused: 2,
      ai_refused_rate_limit: 4,
      ai_provider_429: 5,
      ai_generations: 6,
      map_views: 7,
      trips_shared: 8,
    });
    const { days } = build({ usage, config });
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe("2026-11-21");
    expect(days.at(-1)).toEqual({
      date: "2026-11-27",
      aiGenerations: 6,
      promptTokens: 1_234_567,
      completionTokens: 654_321,
      costUsd: 3.2, // 1.234567 + 3 * 0.654321 = 3.197530
      mapViews: 7,
      tripsShared: 8,
      refusedRateLimit: 4,
      provider429: 5,
      refusedOther: 3,
    });
  });

  it("costs nothing while prices are unset", () => {
    const usage = makeUsageDays(14, "2026-11-27", { ai_prompt_tokens: 1e6 });
    expect(build({ usage }).days.every((d) => d.costUsd === 0)).toBe(true);
  });
});

describe("kpis", () => {
  it("sums the range and the range before it", () => {
    const usage = makeUsageDays(14, "2026-11-27", (i) => ({
      ai_generations: i < 7 ? 1 : 3,
      ai_prompt_tokens: 100,
      ai_completion_tokens: 50,
      ai_provider_429: i === 13 ? 2 : 0,
    }));
    const kpis = Object.fromEntries(
      build({
        usage,
        config: makeRuntimeConfig({
          ai: { inputUsdPerMTokens: 10, outputUsdPerMTokens: 10 },
        }),
      }).kpis.map((k) => [k.id, k]),
    );
    expect(kpis.ai_generations).toMatchObject({ value: 21, previous: 7 });
    expect(kpis.tokens).toMatchObject({ value: 1050, previous: 1050 });
    expect(kpis.cost_usd).toMatchObject({ value: 0.01, previous: 0.01 });
    expect(kpis.provider_429).toMatchObject({ value: 2, previous: 0 });
  });

  it("has no previous period when only one range of data exists", () => {
    const kpis = build({
      usage: makeUsageDays(7, "2026-11-27", { map_views: 2 }),
    }).kpis;
    expect(kpis.find((k) => k.id === "map_views")).toMatchObject({
      value: 14,
      previous: 0,
    });
  });
});

describe("month series", () => {
  it("accumulates actuals to today and projects after", () => {
    const overview = build({
      snapshots: { vercel: makeMonthSnapshot("vercel", "transfer_gb", 3) },
    });
    const series = overview.month.find((m) => m.meterId === "vercel_transfer")!;
    expect(series.limit).toBe(100);
    expect(series.points).toHaveLength(30);
    expect(series.points[0]).toEqual({
      date: "2026-11-01",
      actual: 3,
      projected: null,
    });
    expect(series.points[26]).toEqual({
      date: "2026-11-27",
      actual: 81,
      projected: 81,
    });
    expect(series.points[27]).toEqual({
      date: "2026-11-28",
      actual: null,
      projected: 84,
    });
    expect(series.points[29]).toEqual({
      date: "2026-11-30",
      actual: null,
      projected: 90,
    });
  });

  it("leaves out storage, the llm meter and unconnected providers", () => {
    const overview = build({
      snapshots: {
        upstash: makeSnapshot("upstash", { current: { storage_mb: 10 } }),
      },
    });
    const ids = overview.month.map((m) => m.meterId);
    expect(ids).not.toContain("upstash_storage");
    expect(ids).not.toContain("llm_requests_day");
    expect(ids).not.toContain("vercel_transfer");
  });

  it("knows only today's point when there are no daily values", () => {
    const overview = build({
      snapshots: {
        upstash: makeSnapshot("upstash", { current: { commands_month: 270_000 } }),
      },
    });
    const series = overview.month.find((m) => m.meterId === "upstash_commands")!;
    expect(series.points.filter((p) => p.actual !== null)).toEqual([
      { date: "2026-11-27", actual: 270_000, projected: 270_000 },
    ]);
  });
});

describe("collectedAt", () => {
  it("is the latest snapshot time, or null without snapshots", () => {
    expect(build().collectedAt).toBeNull();
    const overview = build({
      snapshots: {
        vercel: makeSnapshot("vercel", { fetchedAt: 100 }),
        upstash: makeSnapshot("upstash", { fetchedAt: 200 }),
      },
    });
    expect(overview.collectedAt).toBe(200);
  });
});
