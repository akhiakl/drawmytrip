import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const slidingWindow = vi.fn(() => "window");
  const Ctor = vi.fn(function (this: Record<string, unknown>, config: unknown) {
    this.config = config;
  });
  return { slidingWindow, Ctor };
});

vi.mock("@upstash/ratelimit", () => {
  const Ratelimit = mocks.Ctor as unknown as {
    slidingWindow: typeof mocks.slidingWindow;
  };
  Ratelimit.slidingWindow = mocks.slidingWindow;
  return { Ratelimit };
});
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: vi.fn(() => ({})) } }));

import { authLimiter, clientIp, resetAuthLimiter } from "./ratelimit";
import { resetRedisClient } from "./redis";

beforeEach(() => {
  vi.clearAllMocks();
  resetAuthLimiter();
  resetRedisClient();
});

describe("authLimiter", () => {
  it("allows 20 sign-in attempts per hour under its own prefix, built once", () => {
    const first = authLimiter();
    expect(authLimiter()).toBe(first);
    expect(mocks.slidingWindow).toHaveBeenCalledWith(20, "1 h");
    expect(mocks.Ctor).toHaveBeenCalledTimes(1);
    expect(mocks.Ctor).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: "rl:admin", analytics: false }),
    );
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string>) =>
    new Request("http://admin.test", { headers });

  it("prefers the first forwarded address", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe(
      "203.0.113.9",
    );
  });

  it("falls back to x-real-ip, then to localhost", () => {
    expect(clientIp(req({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(req({}))).toBe("127.0.0.1");
  });
});
