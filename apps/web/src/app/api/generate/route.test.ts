import { makeRuntimeConfig } from "@drawmytrip/runtime-config/fixtures";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GenerationError } from "@/lib/ai/generate";
import { makeGenerateRequest, makeModelCallMeter } from "@/test/fixtures/ai";
import { makeTrip } from "@/test/fixtures/trip";

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  getRatelimiter: vi.fn(),
  generateTrip: vi.fn(),
  emit: vi.fn(),
  getRuntimeConfig: vi.fn(),
  recordUsage: vi.fn(),
  readUsage: vi.fn(),
}));

vi.mock("next/server", () => ({ after: (run: () => void) => run() }));

vi.mock("@drawmytrip/runtime-config/store", () => ({
  getRuntimeConfig: mocks.getRuntimeConfig,
}));

vi.mock("@drawmytrip/usage/record", () => ({
  recordUsage: mocks.recordUsage,
  readUsage: mocks.readUsage,
}));

vi.mock("@/lib/logging", () => ({
  emit: mocks.emit,
  errorFields: (error: Error) => ({ errorName: error.name }),
}));

vi.mock("@/lib/http", () => ({
  getRatelimiter: (...args: unknown[]) => {
    mocks.getRatelimiter(...args);
    return { limit: mocks.limit };
  },
  getClientIp: () => "203.0.113.9",
}));

vi.mock("@/lib/ai/generate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/generate")>()),
  generateTrip: mocks.generateTrip,
}));

import { POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.limit.mockResolvedValue({ success: true });
  mocks.getRuntimeConfig.mockResolvedValue(makeRuntimeConfig());
  mocks.readUsage.mockResolvedValue([{ ai_generations: 0 }]);
  mocks.generateTrip.mockResolvedValue({
    trip: makeTrip(),
    suggestedExtra: [],
  });
});

describe("POST /api/generate", () => {
  it("returns the generated trip without saving it", async () => {
    const res = await post(makeGenerateRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trip.title).toBe("Grand Tour");
    expect(body.suggestedExtra).toEqual([]);
  });

  it("returns 429 when the generate budget is exhausted", async () => {
    mocks.limit.mockResolvedValue({ success: false });
    const res = await post(makeGenerateRequest());
    expect(res.status).toBe(429);
    expect(mocks.generateTrip).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON and invalid requests", async () => {
    expect((await post("{nope")).status).toBe(400);
    expect((await post(makeGenerateRequest({ destination: "x" }))).status).toBe(400);
  });

  it("maps unavailable to 503", async () => {
    mocks.generateTrip.mockRejectedValue(new GenerationError("unavailable"));
    const res = await post(makeGenerateRequest());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "generation_unavailable" });
  });

  it("maps invalid model output to a clear 502", async () => {
    mocks.generateTrip.mockRejectedValue(new GenerationError("invalid_output"));
    const res = await post(makeGenerateRequest());
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "generation_failed" });
  });

  it("logs a generated trip without the prompt or the result", async () => {
    await post(makeGenerateRequest());
    expect(mocks.emit).toHaveBeenCalledWith("info", "trip generated", {
      route: "/api/generate",
    });
  });

  it("logs a refused request by reason only", async () => {
    mocks.limit.mockResolvedValue({ success: false });
    await post(makeGenerateRequest());
    expect(mocks.emit).toHaveBeenCalledWith("warn", "request refused", {
      route: "/api/generate",
      status: 429,
      reason: "rate_limited",
    });
  });

  it("logs a malformed body by reason only", async () => {
    await post("not json");
    expect(mocks.emit).toHaveBeenCalledWith("warn", "request refused", {
      route: "/api/generate",
      status: 400,
      reason: "invalid_json",
    });
  });

  it("logs why generation failed without the request contents", async () => {
    mocks.generateTrip.mockRejectedValue(new GenerationError("unavailable"));
    await post(makeGenerateRequest());
    expect(mocks.emit).toHaveBeenCalledWith("error", "generation failed", {
      route: "/api/generate",
      status: 503,
      reason: "unavailable",
    });
  });

  it("logs the model endpoint's HTTP status on an upstream failure", async () => {
    mocks.generateTrip.mockRejectedValue(new GenerationError("upstream", 401));
    await post(makeGenerateRequest());
    expect(mocks.emit).toHaveBeenCalledWith("error", "generation failed", {
      route: "/api/generate",
      status: 502,
      reason: "upstream",
      upstreamStatus: 401,
    });
  });

  it("logs an unexpected error as unexpected, never its message", async () => {
    mocks.generateTrip.mockRejectedValue(new Error("boom with the user prompt"));
    await post(makeGenerateRequest());
    expect(mocks.emit).toHaveBeenCalledWith("error", "generation failed", {
      route: "/api/generate",
      status: 500,
      reason: "unexpected",
      errorName: "Error",
    });
  });

  it("maps unexpected errors to 500", async () => {
    mocks.generateTrip.mockRejectedValue(new Error("boom"));
    expect((await post(makeGenerateRequest())).status).toBe(500);
  });

  describe("runtime limits and usage counters", () => {
    it("uses the guest budget from the runtime config", async () => {
      mocks.getRuntimeConfig.mockResolvedValue(
        makeRuntimeConfig({ guest: { aiPerHour: 9 } }),
      );
      await post(makeGenerateRequest());
      expect(mocks.getRatelimiter).toHaveBeenCalledWith("generate", 9);
    });

    it("refuses with the unavailable contract while AI is off", async () => {
      mocks.getRuntimeConfig.mockResolvedValue(
        makeRuntimeConfig({ ai: { enabled: false } }),
      );
      const res = await post(makeGenerateRequest());
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "generation_unavailable" });
      expect(mocks.limit).not.toHaveBeenCalled();
      expect(mocks.generateTrip).not.toHaveBeenCalled();
      expect(mocks.recordUsage).toHaveBeenCalledWith({ ai_refused_disabled: 1 });
      expect(mocks.emit).toHaveBeenCalledWith("warn", "request refused", {
        route: "/api/generate",
        status: 503,
        reason: "ai_disabled",
      });
    });

    it("counts a rate-limit refusal", async () => {
      mocks.limit.mockResolvedValue({ success: false });
      await post(makeGenerateRequest());
      expect(mocks.recordUsage).toHaveBeenCalledWith({ ai_refused_rate_limit: 1 });
    });

    it("refuses once the daily cap is reached", async () => {
      mocks.getRuntimeConfig.mockResolvedValue(
        makeRuntimeConfig({ ai: { dailyCap: 20 } }),
      );
      mocks.readUsage.mockResolvedValue([{ ai_generations: 20 }]);
      const res = await post(makeGenerateRequest());
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "generation_unavailable" });
      expect(mocks.generateTrip).not.toHaveBeenCalled();
      expect(mocks.recordUsage).toHaveBeenCalledWith({ ai_refused_disabled: 1 });
    });

    it("lets a request through under the daily cap", async () => {
      mocks.getRuntimeConfig.mockResolvedValue(
        makeRuntimeConfig({ ai: { dailyCap: 20 } }),
      );
      mocks.readUsage.mockResolvedValue([{ ai_generations: 19 }]);
      expect((await post(makeGenerateRequest())).status).toBe(200);
    });

    it("records the generation with the model calls, tokens and gauges", async () => {
      mocks.generateTrip.mockImplementation(async (_request, options) => {
        options.onModelCall(
          makeModelCallMeter({ status: 429, promptTokens: 0, completionTokens: 0 }),
        );
        options.onModelCall(
          makeModelCallMeter({
            promptTokens: 200,
            completionTokens: 90,
            rpdLimit: 1000,
            rpdRemaining: 640,
          }),
        );
        return { trip: makeTrip(), suggestedExtra: [] };
      });
      await post(makeGenerateRequest());
      expect(mocks.recordUsage).toHaveBeenCalledWith(
        {
          ai_model_calls: 2,
          ai_prompt_tokens: 200,
          ai_completion_tokens: 90,
          ai_provider_429: 1,
          ai_generations: 1,
        },
        { ai_rpd_limit: 1000, ai_rpd_remaining: 640 },
      );
    });

    it("records a failure only when the model was called", async () => {
      mocks.generateTrip.mockImplementation(async (_request, options) => {
        options.onModelCall(makeModelCallMeter({ status: 500 }));
        throw new GenerationError("upstream", 500);
      });
      await post(makeGenerateRequest());
      expect(mocks.recordUsage).toHaveBeenCalledWith(
        expect.objectContaining({ ai_failures: 1, ai_model_calls: 1 }),
        {},
      );
    });

    it("records no failure when the model was never reached", async () => {
      mocks.generateTrip.mockRejectedValue(new GenerationError("unavailable"));
      await post(makeGenerateRequest());
      const [counters] = mocks.recordUsage.mock.calls.at(-1) ?? [];
      expect(counters).not.toHaveProperty("ai_failures");
    });
  });
});
