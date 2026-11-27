import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeModelCallMeter } from "@/test/fixtures/ai";

vi.mock("@sentry/nextjs", () => ({
  startSpan: (_options: unknown, run: () => unknown) => run(),
}));
vi.mock("@/lib/logging", () => ({
  emit: vi.fn(),
  errorFields: (error: Error) => ({ errorName: error.name }),
}));

import { GenerationError, callModel, type ModelCallMeter } from "./model";

const config = { url: "http://ai.test/v1/chat/completions", model: "test-model" };
const messages = [{ role: "user" as const, content: "hi" }];
const fetchMock = vi.fn();

const okBody = (usage?: object) =>
  JSON.stringify({ choices: [{ message: { content: "{}" } }], usage });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => vi.unstubAllGlobals());

const metered = async (
  respond: () => Response,
): Promise<{ meters: ModelCallMeter[]; error?: unknown }> => {
  fetchMock.mockImplementation(async () => respond());
  const meters: ModelCallMeter[] = [];
  try {
    await callModel(messages, config, 1, undefined, (meter) => meters.push(meter));
    return { meters };
  } catch (error) {
    return { meters, error };
  }
};

describe("callModel metering", () => {
  it("reports status, tokens and the provider's daily request headers", async () => {
    const { meters } = await metered(
      () =>
        new Response(okBody({ prompt_tokens: 210, completion_tokens: 95 }), {
          status: 200,
          headers: {
            "x-ratelimit-limit-requests": "1000",
            "x-ratelimit-remaining-requests": "640",
          },
        }),
    );
    expect(meters).toEqual([
      makeModelCallMeter({
        promptTokens: 210,
        completionTokens: 95,
        rpdLimit: 1000,
        rpdRemaining: 640,
      }),
    ]);
  });

  it("reports zero tokens when the reply has no usage", async () => {
    const { meters } = await metered(() => new Response(okBody(), { status: 200 }));
    expect(meters).toEqual([
      {
        status: 200,
        promptTokens: 0,
        completionTokens: 0,
        rpdLimit: undefined,
        rpdRemaining: undefined,
      },
    ]);
  });

  it("ignores token counts that are not positive numbers", async () => {
    const { meters } = await metered(
      () =>
        new Response(okBody({ prompt_tokens: "12", completion_tokens: -4 }), {
          status: 200,
        }),
    );
    expect(meters[0]).toMatchObject({ promptTokens: 0, completionTokens: 0 });
  });

  it("ignores header values that are not whole numbers", async () => {
    const { meters } = await metered(
      () =>
        new Response(okBody(), {
          status: 200,
          headers: {
            "x-ratelimit-limit-requests": "1e3",
            "x-ratelimit-remaining-requests": "-1",
          },
        }),
    );
    expect(meters[0].rpdLimit).toBeUndefined();
    expect(meters[0].rpdRemaining).toBeUndefined();
  });

  it("reports a failed response before throwing, with zero tokens", async () => {
    const { meters, error } = await metered(
      () =>
        new Response(JSON.stringify({ error: { code: "rate_limit_exceeded" } }), {
          status: 429,
          headers: { "x-ratelimit-remaining-requests": "0" },
        }),
    );
    expect(error).toBeInstanceOf(GenerationError);
    expect(meters).toEqual([
      {
        status: 429,
        promptTokens: 0,
        completionTokens: 0,
        rpdLimit: undefined,
        rpdRemaining: 0,
      },
    ]);
  });

  it("reports a reply that is not JSON before throwing", async () => {
    const { meters, error } = await metered(
      () => new Response("<html>", { status: 200 }),
    );
    expect(error).toBeInstanceOf(GenerationError);
    expect(meters).toHaveLength(1);
    expect(meters[0]).toMatchObject({ status: 200, promptTokens: 0 });
  });

  it("reports nothing when the network fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const onModelCall = vi.fn();
    await expect(
      callModel(messages, config, 1, undefined, onModelCall),
    ).rejects.toBeInstanceOf(GenerationError);
    expect(onModelCall).not.toHaveBeenCalled();
  });

  it("survives a callback that throws", async () => {
    fetchMock.mockImplementation(
      async () => new Response(okBody(), { status: 200 }),
    );
    const onModelCall = vi.fn(() => {
      throw new Error("meter broke");
    });
    await expect(
      callModel(messages, config, 1, undefined, onModelCall),
    ).resolves.toBe("{}");
    expect(onModelCall).toHaveBeenCalledOnce();
  });

  it("works without a callback", async () => {
    fetchMock.mockImplementation(
      async () => new Response(okBody(), { status: 200 }),
    );
    await expect(callModel(messages, config, 1)).resolves.toBe("{}");
  });
});
