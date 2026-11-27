// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  audit: vi.fn(),
  exchange: vi.fn(),
  userId: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  authLimiter: () => ({ limit: mocks.limit }),
  clientIp: () => "203.0.113.9",
}));
vi.mock("@/lib/audit", () => ({ appendAudit: mocks.audit }));
vi.mock("@/lib/github", async (original) => ({
  ...(await original<typeof import("@/lib/github")>()),
  exchangeCodeForToken: mocks.exchange,
  fetchGithubUserId: mocks.userId,
}));

import { AdminAuthError } from "@/lib/github";
import { makeAdminEnv } from "@/test/fixtures/admin";

import { GET } from "./route";

const get = (query = "code=abc&state=s1", cookie = "dmt_admin_state=s1") =>
  GET(
    new Request(`https://admin.test/api/auth/callback?${query}`, {
      headers: { cookie },
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.limit.mockResolvedValue({ success: true });
  mocks.exchange.mockResolvedValue("token");
  mocks.userId.mockResolvedValue(31401662);
  for (const [key, value] of Object.entries(makeAdminEnv())) {
    vi.stubEnv(key, value);
  }
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/auth/callback", () => {
  it("signs in an allowlisted account", async () => {
    const res = await get();
    expect(res.headers.get("location")).toBe("https://admin.test/");
    expect(res.headers.get("set-cookie")).toContain("dmt_admin=");
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "31401662", action: "sign_in" }),
    );
  });

  it("refuses and audits an account that is not allowlisted", async () => {
    mocks.userId.mockResolvedValue(99);
    const res = await get();
    expect(res.headers.get("location")).toBe("https://admin.test/sign-in?error=1");
    expect(res.headers.get("set-cookie")).not.toContain("dmt_admin=ey");
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "99", action: "sign_in_denied" }),
    );
  });

  it("refuses a missing code, a state mismatch and no state cookie", async () => {
    for (const res of [
      await get("state=s1"),
      await get("code=abc&state=other"),
      await get("code=abc&state=s1", ""),
    ]) {
      expect(res.headers.get("location")).toContain("/sign-in?error=1");
    }
    expect(mocks.exchange).not.toHaveBeenCalled();
  });

  it("sends a GitHub failure back to sign-in", async () => {
    mocks.exchange.mockRejectedValue(new AdminAuthError("exchange_failed"));
    expect((await get()).headers.get("location")).toContain("error=1");
  });

  it("does not hide unexpected errors", async () => {
    mocks.exchange.mockRejectedValue(new Error("boom"));
    await expect(get()).rejects.toThrow("boom");
  });

  it("is 404 when unconfigured and 429 when limited", async () => {
    mocks.limit.mockResolvedValue({ success: false });
    expect((await get()).status).toBe(429);
    vi.stubEnv("ADMIN_GITHUB_IDS", "");
    expect((await get()).status).toBe(404);
  });
});
