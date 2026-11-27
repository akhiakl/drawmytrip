import { afterEach, describe, expect, it, vi } from "vitest";

import { checkSiteServices } from "./checks";

const ENV = {
  AI_BASE_URL: "https://ai.test/v1/",
  AI_MODEL: "open-model",
  AI_API_KEY: "sk-test",
  BETTER_STACK_SOURCE_TOKEN: "t",
  BETTER_STACK_INGESTING_URL: "https://logs.test",
  NEXT_PUBLIC_SENTRY_DSN: "https://dsn.test",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function stubFetch(models: unknown = { data: [{ id: "open-model" }] }) {
  const fetchMock = vi.fn<
    (input: string | URL, init?: RequestInit) => Promise<Response>
  >((input) => {
    const url = String(input);
    if (url.endsWith("/models")) return Promise.resolve(json(models));
    return Promise.resolve(json({}));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const run = (env: Record<string, string> = ENV, up = true) =>
  checkSiteServices(
    { env, pingStore: async () => up, mapStyleUrl: "https://tiles.test/style" },
    () => 1000,
  );

const byId = (report: Awaited<ReturnType<typeof run>>) =>
  Object.fromEntries(report.services.map((check) => [check.id, check]));

afterEach(() => vi.unstubAllGlobals());

describe("checkSiteServices", () => {
  it("probes every live service and reports the sinks as configured", async () => {
    const fetchMock = stubFetch();
    const report = await run();

    expect(report.checkedAt).toBe(1000);
    expect(report.services.map((check) => [check.id, check.status])).toEqual([
      ["redis", "up"],
      ["ai", "up"],
      ["geocoding", "up"],
      ["rates", "up"],
      ["map", "up"],
      ["logs", "configured"],
      ["errors", "configured"],
    ]);
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls).toContain("https://ai.test/v1/models");
    expect(urls).toContain("https://tiles.test/style");
    expect(
      urls.some((url) => url.startsWith("https://photon.komoot.io/api/?q=Paris")),
    ).toBe(true);
    expect(urls.some((url) => url.startsWith("https://api.frankfurter.dev/"))).toBe(
      true,
    );
  });

  it("sends the AI key as a bearer token", async () => {
    const fetchMock = stubFetch();
    await run();
    const aiCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith("/models"),
    );
    expect(aiCall?.[1]).toMatchObject({
      headers: { authorization: "Bearer sk-test" },
    });
  });

  it("flags an AI model the provider does not list", async () => {
    stubFetch({ data: [{ id: "other-model" }] });
    expect(byId(await run()).ai).toMatchObject({
      status: "down",
      detail: "model_missing",
    });
  });

  it("accepts a provider whose model list has another shape", async () => {
    stubFetch({ models: ["open-model"] });
    expect(byId(await run()).ai.status).toBe("up");
  });

  it("reports an AI error status by code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 401)));
    expect(byId(await run()).ai).toMatchObject({
      status: "down",
      detail: "http_401",
    });
  });

  it("marks missing settings and a down store", async () => {
    stubFetch();
    const checks = byId(await run({ RATES_API_URL: "https://rates.test" }, false));
    expect(checks.redis.status).toBe("down");
    expect(checks.ai.status).toBe("not_configured");
    expect(checks.logs.status).toBe("not_configured");
    expect(checks.errors.status).toBe("not_configured");
  });
});
