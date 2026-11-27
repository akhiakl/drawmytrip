import "server-only";

import { Redis } from "@upstash/redis";

let client: Redis | null = null;

/** One lazily built client, so importing never needs env at build time. */
export const redis = (): Redis => (client ??= Redis.fromEnv());

/** Test helper. */
export function resetRedisClient(): void {
  client = null;
}
