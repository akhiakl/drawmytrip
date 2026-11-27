import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/** Per-IP sliding-window budgets for the public API routes. */
const LIMITS = {
  trips: { requests: 10, window: "1 h" },
  generate: { requests: 5, window: "1 h" },
  suggest: { requests: 10, window: "1 h" },
} as const satisfies Record<string, { requests: number; window: "1 h" }>;

export type RatelimitName = keyof typeof LIMITS;

const limiters = new Map<string, Ratelimit>();

/**
 * Lazily built so importing this module never requires env at build time.
 * `requests` replaces the default budget (the admin edits it at runtime);
 * each budget gets its own cached limiter.
 */
export function getRatelimiter(name: RatelimitName, requests?: number): Ratelimit {
  const budget = requests ?? LIMITS[name].requests;
  const cacheKey = `${name}:${budget}`;
  const existing = limiters.get(cacheKey);
  if (existing) return existing;

  const { window } = LIMITS[name];
  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(budget, window),
    prefix: `rl:${name}`,
    analytics: false,
  });
  limiters.set(cacheKey, limiter);
  return limiter;
}

/** Best-effort client IP for rate limiting behind proxies/CDNs. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "127.0.0.1";
}
