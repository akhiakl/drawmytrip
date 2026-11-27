// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminEnv } from "@/test/fixtures/admin";

const limit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ratelimit", () => ({
  authLimiter: () => ({ limit }),
  clientIp: () => "203.0.113.9",
}));

import { GET } from "./route";

const get = () => GET(new Request("https://admin.test/api/auth/login"));

beforeEach(() => {
  limit.mockResolvedValue({ success: true });
  for (const [key, value] of Object.entries(makeAdminEnv())) {
    vi.stubEnv(key, value);
  }
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/auth/login", () => {
  it("redirects to GitHub with a state that is also set as a cookie", async () => {
    const res = await get();
    const location = new URL(res.headers.get("location")!);
    expect(location.host).toBe("github.com");
    const state = location.searchParams.get("state")!;
    expect(res.headers.get("set-cookie")).toContain(`dmt_admin_state=${state}`);
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    expect(location.searchParams.get("redirect_uri")).toBe(
      "https://admin.test/api/auth/callback",
    );
  });

  it("is 404 when admin is not configured", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    expect((await get()).status).toBe(404);
  });

  it("is 429 when the visitor is over the limit", async () => {
    limit.mockResolvedValue({ success: false });
    expect((await get()).status).toBe(429);
  });
});
