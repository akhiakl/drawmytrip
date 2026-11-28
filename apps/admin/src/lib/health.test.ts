import { makeHealthReport, makeServiceCheck } from "@drawmytrip/health/fixtures";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redisMock = vi.hoisted(() => ({ ping: vi.fn() }));
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: vi.fn(() => redisMock) } }));

import { loadHealth } from "./health";
import { resetRedisClient } from "./redis";

const FULL_ENV = {
  HEALTH_CHECK_SECRET: "s3cret",
  WEB_ORIGIN: "https://web.test/",
  VERCEL_API_TOKEN: "vt",
  VERCEL_TEAM_ID: "team_1",
  UPSTASH_EMAIL: "ops@example.com",
  UPSTASH_API_KEY: "uk",
  UPSTASH_DATABASE_ID: "db1",
  ADMIN_GITHUB_CLIENT_ID: "id",
  ADMIN_GITHUB_CLIENT_SECRET: "secret",
  ADMIN_GITHUB_IDS: "1",
  ADMIN_SESSION_SECRET: "x".repeat(32),
  CRON_SECRET: "c",
};

const report = makeHealthReport({
  services: [makeServiceCheck(), makeServiceCheck({ id: "ai", status: "down" })],
});

function stubFetch(siteReply: Response = Response.json(report)) {
  const fetchMock = vi.fn((input: string | URL) =>
    Promise.resolve(
      String(input).includes("/api/health/services") ? siteReply : Response.json({}),
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const statuses = (checks: { id: string; status: string }[]) =>
  checks.map((check) => [check.id, check.status]);

beforeEach(() => {
  vi.clearAllMocks();
  resetRedisClient();
  redisMock.ping.mockResolvedValue("PONG");
});
afterEach(() => vi.unstubAllGlobals());

describe("loadHealth", () => {
  it("puts the site first, then what it reported, then the console's own checks", async () => {
    const fetchMock = stubFetch();
    const health = await loadHealth(FULL_ENV, () => 7);

    expect(health.checkedAt).toBe(7);
    expect(statuses(health.site)).toEqual([
      ["site", "up"],
      ["redis", "up"],
      ["ai", "down"],
    ]);
    expect(statuses(health.admin)).toEqual([
      ["admin_store", "up"],
      ["vercel_api", "up"],
      ["upstash_api", "up"],
      ["github_sign_in", "configured"],
      ["cron", "configured"],
    ]);
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const byUrl = Object.fromEntries(calls.map(([url, init]) => [url, init]));
    expect(byUrl["https://web.test/api/health/services"]?.headers).toEqual({
      authorization: "Bearer s3cret",
    });
    expect(byUrl["https://api.vercel.com/v2/teams/team_1"]?.headers).toMatchObject({
      authorization: "Bearer vt",
    });
    expect(
      byUrl["https://api.upstash.com/v2/redis/database/db1"]?.headers,
    ).toMatchObject({
      authorization: `Basic ${btoa("ops@example.com:uk")}`,
    });
  });

  it("reports the site down by status code, or for a reply it cannot read", async () => {
    stubFetch(new Response("", { status: 401 }));
    expect((await loadHealth(FULL_ENV)).site).toEqual([
      expect.objectContaining({ id: "site", status: "down", detail: "http_401" }),
    ]);

    stubFetch(Response.json({ nope: true }));
    expect((await loadHealth(FULL_ENV)).site[0]).toMatchObject({
      status: "down",
      detail: "invalid_reply",
    });
  });

  it("marks what is not set up, and checks the token alone without a team", async () => {
    const fetchMock = stubFetch();
    redisMock.ping.mockRejectedValue(new Error("down"));
    const health = await loadHealth({ VERCEL_API_TOKEN: "vt" });

    expect(statuses(health.site)).toEqual([["site", "not_configured"]]);
    expect(statuses(health.admin)).toEqual([
      ["admin_store", "down"],
      ["vercel_api", "up"],
      ["upstash_api", "not_configured"],
      ["github_sign_in", "not_configured"],
      ["cron", "not_configured"],
    ]);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "https://api.vercel.com/v2/user",
    ]);
  });

  it("defaults to the canonical site", async () => {
    const fetchMock = stubFetch();
    await loadHealth({ HEALTH_CHECK_SECRET: "s3cret" });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toContain(
      "https://www.drawmytrip.click/api/health/services",
    );
  });
});
