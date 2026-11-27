import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makePhotonFeature, makePhotonResponse } from "@/test/fixtures/geo-search";
import { makeSpanRecorder } from "@/test/fixtures/sentry";
import { makeSuggestions } from "@/test/fixtures/suggest";

const recorder = makeSpanRecorder();
vi.mock("@sentry/nextjs", () => ({
  startSpan: (...args: Parameters<typeof recorder.startSpan>) =>
    recorder.startSpan(...args),
}));

const emit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/logging", () => ({
  emit,
  errorFields: (error: Error) => ({ errorName: error.name }),
}));

const redisMock = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: vi.fn(() => redisMock) },
}));

import { SUGGEST_TTL_SECONDS, suggestPlaces } from "./suggest";

const fetchMock = vi.fn();
const toronto = makeSuggestions("city");
const request = { destination: "  Toronto  " };

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const modelResponse = (content: string) =>
  json({ choices: [{ message: { content } }] });

/** Photon answers each query with a hit at the place's own coordinates. */
const photonEchoes = (url: URL) => {
  const name = url.searchParams.get("q");
  const match = toronto.candidates.find((c) => c.name === name);
  if (!match) return json(makePhotonResponse([]));
  const [lat, lng] = match.ll;
  return json(
    makePhotonResponse([makePhotonFeature({ name: name! }, [lng + 0.001, lat])]),
  );
};

function route(handlers: {
  model: () => Response;
  photon?: (url: URL) => Response;
}) {
  fetchMock.mockImplementation(async (input: URL | string) => {
    const url = new URL(input.toString());
    return url.host === "photon.komoot.io"
      ? (handlers.photon ?? photonEchoes)(url)
      : handlers.model();
  });
}

const photonCalls = () =>
  fetchMock.mock.calls.filter(([url]) => String(url).includes("photon.komoot.io"));
const modelCalls = () =>
  fetchMock.mock.calls.filter(([url]) => !String(url).includes("photon.komoot.io"));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("AI_BASE_URL", "http://ai.test/v1/");
  vi.stubEnv("AI_MODEL", "test-model");
  fetchMock.mockReset();
  redisMock.get.mockReset().mockResolvedValue(null);
  redisMock.set.mockReset().mockResolvedValue("OK");
  recorder.spans.length = 0;
  emit.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("suggestPlaces", () => {
  it("throws unavailable without model config, before any network call", async () => {
    vi.stubEnv("AI_MODEL", "");
    await expect(suggestPlaces(request)).rejects.toMatchObject({
      reason: "unavailable",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serves a cache hit without calling the model or Photon", async () => {
    redisMock.get.mockResolvedValue(toronto);
    expect(await suggestPlaces(request)).toEqual(toronto);
    expect(redisMock.get).toHaveBeenCalledWith("suggest:v1:toronto");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(recorder.spans[0].attributes).toMatchObject({
      "suggest.cache_hit": true,
    });
  });

  it("ignores a cached value that no longer matches the schema", async () => {
    redisMock.get.mockResolvedValue({ scope: "world" });
    route({ model: () => modelResponse(JSON.stringify(toronto)) });
    await suggestPlaces(request);
    expect(modelCalls()).toHaveLength(1);
  });

  it("checks places with Photon, takes its coordinates and caches for 30 days", async () => {
    route({ model: () => modelResponse(JSON.stringify(toronto)) });
    const result = await suggestPlaces(request);

    expect(photonCalls()).toHaveLength(toronto.candidates.length);
    expect(result.candidates[0].ll[1]).toBeCloseTo(
      toronto.candidates[0].ll[1] + 0.001,
      5,
    );
    expect(redisMock.set).toHaveBeenCalledWith("suggest:v1:toronto", result, {
      ex: SUGGEST_TTL_SECONDS,
    });
    expect(modelCalls()[0][1].body).toContain('"temperature":0.4');
  });

  it("drops a place Photon can't find but keeps a city it misses", async () => {
    const mixed = makeSuggestions("city", {
      candidates: [
        ...toronto.candidates,
        { name: "Fake Palace", kind: "sight", ll: [43.65, -79.38] },
      ],
    });
    route({ model: () => modelResponse(JSON.stringify(mixed)) });
    const names = (await suggestPlaces(request)).candidates.map((c) => c.name);
    expect(names).not.toContain("Fake Palace");
    expect(names).toContain("CN Tower");

    const region = makeSuggestions("region");
    route({
      model: () => modelResponse(JSON.stringify(region)),
      photon: () => json(makePhotonResponse([])),
    });
    const kept = await suggestPlaces({ destination: "Austria" });
    expect(kept.candidates).toHaveLength(region.candidates.length);
  });

  it("serves the model's list uncached when Photon leaves too little", async () => {
    route({
      model: () => modelResponse(JSON.stringify(toronto)),
      photon: () => json(makePhotonResponse([])),
    });
    const result = await suggestPlaces(request);
    expect(result.candidates).toHaveLength(toronto.candidates.length);
    expect(redisMock.set).not.toHaveBeenCalled();
    expect(recorder.spans[0].attributes).toMatchObject({ "suggest.checked": false });
  });

  it("serves the model's list uncached when the check times out", async () => {
    vi.useFakeTimers();
    try {
      route({
        model: () => modelResponse(JSON.stringify(toronto)),
        photon: () => new Response("slow"),
      });
      fetchMock.mockImplementation(
        async (input: URL | string, init?: RequestInit) => {
          if (new URL(input.toString()).host !== "photon.komoot.io") {
            return modelResponse(JSON.stringify(toronto));
          }
          return new Promise<Response>((_, reject) =>
            init?.signal?.addEventListener("abort", () =>
              reject(new Error("aborted")),
            ),
          );
        },
      );
      const pending = suggestPlaces(request);
      await vi.advanceTimersByTimeAsync(3000);
      const result = await pending;
      expect(result.candidates).toHaveLength(toronto.candidates.length);
      expect(redisMock.set).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("works when Redis is down", async () => {
    redisMock.get.mockRejectedValue(new Error("down"));
    redisMock.set.mockRejectedValue(new Error("down"));
    route({ model: () => modelResponse(JSON.stringify(toronto)) });
    expect((await suggestPlaces(request)).scope).toBe("city");
    expect(emit).toHaveBeenCalledWith(
      "warn",
      "suggest cache unavailable",
      expect.anything(),
    );
  });

  it("retries once with the validation errors, then succeeds", async () => {
    const replies = [
      modelResponse("not json"),
      modelResponse(JSON.stringify(toronto)),
    ];
    route({ model: () => replies.shift()! });
    await suggestPlaces(request);
    expect(modelCalls()).toHaveLength(2);
    expect(modelCalls()[1][1].body).toContain("failed validation");
  });

  it("throws invalid_output when both drafts are invalid", async () => {
    route({ model: () => modelResponse("{}") });
    await expect(suggestPlaces(request)).rejects.toMatchObject({
      reason: "invalid_output",
    });
    expect(modelCalls()).toHaveLength(2);
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it("records only allowlisted span attributes, never the destination", async () => {
    route({ model: () => modelResponse(JSON.stringify(toronto)) });
    await suggestPlaces(request);
    const [span] = recorder.spans;
    expect(span.name).toBe("ai.suggest");
    expect(Object.keys(span.attributes).sort()).toEqual([
      "ai.model",
      "suggest.cache_hit",
      "suggest.candidates",
      "suggest.checked",
      "suggest.scope",
    ]);
    expect(JSON.stringify(span.attributes)).not.toMatch(/toronto/i);
  });
});
