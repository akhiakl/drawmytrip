import { afterEach, describe, expect, it, vi } from "vitest";

import { httpOutcome, notConfigured, probe, settingsCheck } from "./probe";

afterEach(() => vi.unstubAllGlobals());

describe("probe", () => {
  it("reports up with the measured latency", async () => {
    const clock = vi.fn().mockReturnValueOnce(1000).mockReturnValueOnce(1042.4);
    const check = await probe("redis", async () => ({ ok: true }), 1000, clock);
    expect(check).toEqual({ id: "redis", status: "up", latencyMs: 42 });
  });

  it("keeps the probe's own failure code", async () => {
    const check = await probe("ai", async () => ({ ok: false, detail: "model_missing" }));
    expect(check).toMatchObject({ status: "down", detail: "model_missing" });
  });

  it("turns a throw into down without leaking the message", async () => {
    const check = await probe("ai", async () => {
      throw new Error("secret upstream body");
    });
    expect(check).toMatchObject({ status: "down", detail: "error" });
  });

  it("reports a probe that outlives its budget as a timeout", async () => {
    const check = await probe(
      "photon",
      (signal) =>
        new Promise((_, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
      5,
    );
    expect(check).toMatchObject({ status: "down", detail: "timeout" });
  });
});

describe("httpOutcome", () => {
  it("counts a 2xx as up and sends the given headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;

    await expect(
      httpOutcome("https://svc.test/ping", signal, { authorization: "Bearer k" }),
    ).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("https://svc.test/ping", {
      headers: { accept: "application/json", authorization: "Bearer k" },
      signal,
      cache: "no-store",
    });
  });

  it("reports other answers by status code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
    await expect(
      httpOutcome("https://svc.test", new AbortController().signal),
    ).resolves.toEqual({ ok: false, detail: "http_503" });
  });
});

describe("settings-only checks", () => {
  it("say configured or not without a probe", () => {
    expect(settingsCheck("sentry", true)).toEqual({ id: "sentry", status: "configured" });
    expect(settingsCheck("sentry", false).status).toBe("not_configured");
    expect(notConfigured("vercel")).toEqual({ id: "vercel", status: "not_configured" });
  });
});
