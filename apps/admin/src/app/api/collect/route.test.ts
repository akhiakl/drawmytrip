// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const collectAll = vi.hoisted(() => vi.fn());
vi.mock("@/lib/collect", () => ({ collectAll }));

import { GET } from "./route";

const call = (authorization?: string) =>
  GET(
    new Request("http://localhost/api/collect", {
      headers: authorization ? { authorization } : {},
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "cron-secret");
  collectAll.mockResolvedValue({ vercel: "ok", upstash: "ok" });
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/collect", () => {
  it("runs the collectors for the cron bearer", async () => {
    const res = await call("Bearer cron-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      statuses: { vercel: "ok", upstash: "ok" },
    });
  });

  it("rejects a missing, wrong or same-length wrong bearer", async () => {
    for (const header of [undefined, "Bearer nope", "Bearer cron-secreX"]) {
      expect((await call(header)).status).toBe(401);
    }
    expect(collectAll).not.toHaveBeenCalled();
  });

  it("rejects everything when no secret is configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(401);
  });
});
