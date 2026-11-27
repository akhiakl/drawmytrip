import "server-only";

import { Ratelimit } from "@upstash/ratelimit";

import { redis } from "./redis";

let limiter: Ratelimit | null = null;

/** 20 sign-in attempts per visitor per hour. */
export function authLimiter(): Ratelimit {
  return (limiter ??= new Ratelimit({
    redis: redis(),
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    prefix: "rl:admin",
    analytics: false,
  }));
}

/** Best-effort client address behind Vercel's proxy. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

/** Test helper. */
export function resetAuthLimiter(): void {
  limiter = null;
}
