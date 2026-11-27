import { makeHealthReport } from "@drawmytrip/health/fixtures";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ check: vi.fn(), pingStore: vi.fn() }));
vi.mock("@/lib/health", () => ({ checkSiteServices: mocks.check }));
vi.mock("@/lib/trip/service", () => ({ pingStore: mocks.pingStore }));

import { GET } from "./route";

const call = (authorization?: string) =>
  GET(
    new Request("http://localhost/api/health/services", {
      headers: authorization ? { authorization } : {},
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.check.mockResolvedValue(makeHealthReport());
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/health/services", () => {
  it("does not exist until a secret is set", async () => {
    vi.stubEnv("HEALTH_CHECK_SECRET", "");
    expect((await call("Bearer anything")).status).toBe(404);
    expect(mocks.check).not.toHaveBeenCalled();
  });

  it("refuses a missing or wrong token", async () => {
    vi.stubEnv("HEALTH_CHECK_SECRET", "s3cret");
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(mocks.check).not.toHaveBeenCalled();
  });

  it("returns a fresh, uncached report for the admin", async () => {
    vi.stubEnv("HEALTH_CHECK_SECRET", "s3cret");
    const response = await call("Bearer s3cret");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(makeHealthReport());
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.check).toHaveBeenCalledWith(
      expect.objectContaining({ pingStore: mocks.pingStore }),
    );
  });
});
