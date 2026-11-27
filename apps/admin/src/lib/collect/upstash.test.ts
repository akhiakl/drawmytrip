// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { collectUpstash } from "./upstash";

const now = new Date("2026-11-27T04:00:00Z");
const env = {
  UPSTASH_EMAIL: "a@b.c",
  UPSTASH_API_KEY: "k",
  UPSTASH_DATABASE_ID: "db",
};
const fetchMock = vi.fn();
const reply = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("collectUpstash", () => {
  it("is not_configured when a credential is missing", async () => {
    expect((await collectUpstash({ ...env, UPSTASH_API_KEY: "" }, now)).status).toBe(
      "not_configured",
    );
  });

  it("reads this month's daily commands and storage in MB", async () => {
    vi.stubGlobal("fetch", fetchMock);
    reply({
      dailyrequests: [
        { x: "2026-10-31 00:00:00", y: 9 },
        { x: "2026-11-01 00:00:00", y: 100 },
        { x: "2026-11-02 00:00:00", y: 200 },
      ],
      current_storage: 2 * 1024 * 1024,
    });
    const snap = await collectUpstash(env, now);
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe(
      `Basic ${btoa("a@b.c:k")}`,
    );
    expect(snap.daily).toEqual([
      { date: "2026-11-01", values: { commands: 100 } },
      { date: "2026-11-02", values: { commands: 200 } },
    ]);
    expect(snap.current).toEqual({ storage_mb: 2 });
  });

  it("falls back to the monthly total when there is no daily series", async () => {
    vi.stubGlobal("fetch", fetchMock);
    reply({ total_monthly_requests: 5000, total_monthly_storage: 1024 * 1024 });
    const snap = await collectUpstash(env, now);
    expect(snap.current).toEqual({ storage_mb: 1, commands_month: 5000 });
  });

  it("is unavailable on errors, odd bodies and network failures", async () => {
    vi.stubGlobal("fetch", fetchMock);
    reply({}, 401);
    expect((await collectUpstash(env, now)).status).toBe("unavailable");
    reply({ dailyrequests: "nope" });
    expect((await collectUpstash(env, now)).status).toBe("unavailable");
    fetchMock.mockRejectedValue(new Error("down"));
    expect((await collectUpstash(env, now)).status).toBe("unavailable");
  });
});
