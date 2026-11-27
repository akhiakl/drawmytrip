import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeModelCallMeter } from "@/test/fixtures/ai";

const usage = vi.hoisted(() => ({ readUsage: vi.fn(), recordUsage: vi.fn() }));
vi.mock("@drawmytrip/usage/record", () => usage);

import { dailyCapReached, summarizeModelCalls } from "./index";

beforeEach(() => vi.clearAllMocks());

describe("summarizeModelCalls", () => {
  it("sums tokens and counts calls and provider 429s", () => {
    const { counters } = summarizeModelCalls([
      makeModelCallMeter({ promptTokens: 100, completionTokens: 40 }),
      makeModelCallMeter({ status: 429, promptTokens: 0, completionTokens: 0 }),
      makeModelCallMeter({ promptTokens: 60, completionTokens: 10 }),
    ]);
    expect(counters).toEqual({
      ai_model_calls: 3,
      ai_prompt_tokens: 160,
      ai_completion_tokens: 50,
      ai_provider_429: 1,
    });
  });

  it("takes the gauges from the last call that carried them", () => {
    const { gauges } = summarizeModelCalls([
      makeModelCallMeter({ rpdLimit: 1000, rpdRemaining: 900 }),
      makeModelCallMeter({ rpdLimit: undefined, rpdRemaining: 899 }),
    ]);
    expect(gauges).toEqual({ ai_rpd_limit: 1000, ai_rpd_remaining: 899 });
  });

  it("has no gauges when no call carried headers", () => {
    expect(summarizeModelCalls([makeModelCallMeter()]).gauges).toEqual({});
  });

  it("reports zero calls for none", () => {
    expect(summarizeModelCalls([]).counters.ai_model_calls).toBe(0);
  });
});

describe("dailyCapReached", () => {
  it("is false without a cap and reads nothing", async () => {
    expect(await dailyCapReached(0)).toBe(false);
    expect(usage.readUsage).not.toHaveBeenCalled();
  });

  it("is true at or over the cap", async () => {
    usage.readUsage.mockResolvedValue([{ ai_generations: 20 }]);
    expect(await dailyCapReached(20)).toBe(true);
  });

  it("is false under the cap", async () => {
    usage.readUsage.mockResolvedValue([{ ai_generations: 19 }]);
    expect(await dailyCapReached(20)).toBe(false);
  });

  it("fails open when the counters cannot be read", async () => {
    usage.readUsage.mockRejectedValue(new Error("down"));
    expect(await dailyCapReached(20)).toBe(false);
  });
});
