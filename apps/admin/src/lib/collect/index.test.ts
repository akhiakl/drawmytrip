// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeSnapshot } from "@/test/fixtures/admin";

const mocks = vi.hoisted(() => ({
  set: vi.fn(),
  get: vi.fn(),
  vercel: vi.fn(),
  upstash: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("../redis", () => ({ redis: () => ({ set: mocks.set, get: mocks.get }) }));
vi.mock("../audit", () => ({ appendAudit: mocks.audit }));
vi.mock("./vercel", () => ({ collectVercel: mocks.vercel }));
vi.mock("./upstash", () => ({ collectUpstash: mocks.upstash }));

import { SNAPSHOT_TTL_SECONDS, collectAll, latestSnapshots } from "./index";

const now = new Date("2026-11-27T04:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.vercel.mockResolvedValue(makeSnapshot("vercel"));
  mocks.upstash.mockResolvedValue(
    makeSnapshot("upstash", { status: "not_configured" }),
  );
});

describe("collectAll", () => {
  it("stores one snapshot per provider and audits the run", async () => {
    const statuses = await collectAll({}, now);
    expect(statuses).toEqual({ vercel: "ok", upstash: "not_configured" });
    expect(mocks.set).toHaveBeenCalledWith(
      "snap:vercel:2026-11-27",
      expect.objectContaining({ provider: "vercel" }),
      { ex: SNAPSHOT_TTL_SECONDS },
    );
    expect(mocks.set).toHaveBeenCalledWith(
      "snap:upstash:2026-11-27",
      expect.anything(),
      expect.anything(),
    );
    expect(mocks.audit).toHaveBeenCalledWith({
      at: now.getTime(),
      actor: "cron",
      action: "usage_collected",
      detail: "vercel: ok; upstash: not_configured",
    });
  });

  it("keeps going when one collector throws", async () => {
    mocks.vercel.mockRejectedValue(new Error("boom"));
    const statuses = await collectAll({}, now);
    expect(statuses.vercel).toBe("unavailable");
    expect(mocks.set).toHaveBeenCalledTimes(1);
  });
});

describe("latestSnapshots", () => {
  it("prefers today, falls back to yesterday, skips invalid rows", async () => {
    mocks.get.mockImplementation(async (key: string) => {
      if (key === "snap:vercel:2026-11-27") return makeSnapshot("vercel");
      if (key === "snap:upstash:2026-11-27") return { bad: true };
      if (key === "snap:upstash:2026-11-26") return makeSnapshot("upstash");
      return null;
    });
    const out = await latestSnapshots(now);
    expect(out.vercel?.provider).toBe("vercel");
    expect(out.upstash?.provider).toBe("upstash");
  });

  it("leaves a provider out when neither day has one", async () => {
    mocks.get.mockResolvedValue(null);
    expect(await latestSnapshots(now)).toEqual({});
  });
});
