import { makeRuntimeConfig } from "@drawmytrip/runtime-config/fixtures";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GenerationError } from "@/lib/ai/generate";
import { makeModelCallMeter } from "@/test/fixtures/ai";
import { makeSuggestions } from "@/test/fixtures/suggest";

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  suggestPlaces: vi.fn(),
  emit: vi.fn(),
  getRuntimeConfig: vi.fn(),
  recordUsage: vi.fn(),
}));

vi.mock("next/server", () => ({ after: (run: () => void) => run() }));

vi.mock("@drawmytrip/runtime-config/store", () => ({
  getRuntimeConfig: mocks.getRuntimeConfig,
}));

vi.mock("@drawmytrip/usage/record", () => ({
  recordUsage: mocks.recordUsage,
  readUsage: vi.fn(),
}));

vi.mock("@/lib/logging", () => ({
  emit: mocks.emit,
  errorFields: (error: Error) => ({ errorName: error.name }),
}));

vi.mock("@/lib/http", () => ({
  getRatelimiter: () => ({ limit: mocks.limit }),
  getClientIp: () => "203.0.113.9",
}));

vi.mock("@/lib/ai/suggest", () => ({ suggestPlaces: mocks.suggestPlaces }));

import { POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.limit.mockResolvedValue({ success: true });
  mocks.getRuntimeConfig.mockResolvedValue(makeRuntimeConfig());
  mocks.suggestPlaces.mockResolvedValue(makeSuggestions("city"));
});

describe("POST /api/suggest", () => {
  it("returns the suggestions", async () => {
    const res = await post({ destination: "Toronto" });
    expect(res.status).toBe(200);
    expect((await res.json()).scope).toBe("city");
    expect(mocks.suggestPlaces).toHaveBeenCalledWith(
      { destination: "Toronto" },
      { onModelCall: expect.any(Function) },
    );
  });

  it("returns 429 when the suggest budget is exhausted", async () => {
    mocks.limit.mockResolvedValue({ success: false });
    expect((await post({ destination: "Toronto" })).status).toBe(429);
    expect(mocks.suggestPlaces).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON and invalid requests", async () => {
    expect((await post("{nope")).status).toBe(400);
    expect((await post({ destination: "x" })).status).toBe(400);
    expect((await post({})).status).toBe(400);
  });

  it("maps unavailable to 503", async () => {
    mocks.suggestPlaces.mockRejectedValue(new GenerationError("unavailable"));
    const res = await post({ destination: "Toronto" });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "suggestions_unavailable" });
  });

  it("maps upstream and invalid output to 502", async () => {
    for (const reason of ["upstream", "invalid_output"] as const) {
      mocks.suggestPlaces.mockRejectedValue(new GenerationError(reason, 500));
      const res = await post({ destination: "Toronto" });
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: "suggestions_failed" });
    }
  });

  it("maps an unexpected error to 500 without the destination in the log", async () => {
    mocks.suggestPlaces.mockRejectedValue(new Error("boom"));
    const res = await post({ destination: "Toronto" });
    expect(res.status).toBe(500);
    expect(JSON.stringify(mocks.emit.mock.calls)).not.toContain("Toronto");
  });

  it("logs a refusal by reason only", async () => {
    mocks.limit.mockResolvedValue({ success: false });
    await post({ destination: "Toronto" });
    expect(mocks.emit).toHaveBeenCalledWith("warn", "request refused", {
      route: "/api/suggest",
      status: 429,
      reason: "rate_limited",
    });
  });

  describe("runtime limits and usage counters", () => {
    it("refuses with the unavailable contract while AI is off", async () => {
      mocks.getRuntimeConfig.mockResolvedValue(
        makeRuntimeConfig({ ai: { enabled: false } }),
      );
      const res = await post({ destination: "Toronto" });
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "suggestions_unavailable" });
      expect(mocks.suggestPlaces).not.toHaveBeenCalled();
      expect(mocks.recordUsage).toHaveBeenCalledWith({ ai_refused_disabled: 1 });
    });

    it("records the model calls and tokens of a request", async () => {
      mocks.suggestPlaces.mockImplementation(async (_request, options) => {
        options.onModelCall(
          makeModelCallMeter({ promptTokens: 300, completionTokens: 150 }),
        );
        return makeSuggestions("city");
      });
      await post({ destination: "Toronto" });
      expect(mocks.recordUsage).toHaveBeenCalledWith(
        {
          ai_model_calls: 1,
          ai_prompt_tokens: 300,
          ai_completion_tokens: 150,
          ai_provider_429: 0,
        },
        {},
      );
    });

    it("still records the calls made before a failure", async () => {
      mocks.suggestPlaces.mockImplementation(async (_request, options) => {
        options.onModelCall(makeModelCallMeter({ status: 429 }));
        throw new GenerationError("upstream", 429);
      });
      await post({ destination: "Toronto" });
      expect(mocks.recordUsage).toHaveBeenCalledWith(
        expect.objectContaining({ ai_model_calls: 1, ai_provider_429: 1 }),
        {},
      );
    });
  });
});
