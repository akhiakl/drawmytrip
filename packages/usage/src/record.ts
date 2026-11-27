import "server-only";

import { Redis } from "@upstash/redis";

import {
  USAGE_TTL_SECONDS,
  dateKey,
  parseDay,
  usageKey,
  type CounterMetric,
  type DailyUsage,
  type GaugeMetric,
} from "./metrics";

const DAY_MS = 24 * 60 * 60 * 1000;

let client: Redis | null = null;
const redis = (): Redis => (client ??= Redis.fromEnv());

/** Test helper. */
export function resetUsageClient(): void {
  client = null;
}

/**
 * Adds to today's counters in one pipeline: HINCRBY per non-zero counter,
 * HSET per gauge, then EXPIRE. Nothing to write means no call. Never
 * throws: counting must not break a request.
 */
export async function recordUsage(
  counters: Partial<Record<CounterMetric, number>>,
  gauges: Partial<Record<GaugeMetric, number>> = {},
  now = new Date(),
): Promise<void> {
  const increments = Object.entries(counters).filter(
    ([, value]) => Number.isFinite(value) && value !== 0,
  );
  const sets = Object.entries(gauges).filter(([, value]) => Number.isFinite(value));
  if (increments.length === 0 && sets.length === 0) return;

  try {
    const key = usageKey(now);
    const pipeline = redis().pipeline();
    for (const [field, value] of increments)
      pipeline.hincrby(key, field, value as number);
    for (const [field, value] of sets)
      pipeline.hset(key, { [field]: value as number });
    pipeline.expire(key, USAGE_TTL_SECONDS);
    await pipeline.exec();
  } catch (error) {
    console.warn(
      "[usage] record failed",
      error instanceof Error ? error.name : typeof error,
    );
  }
}

/** `days` days ending at `today` inclusive, oldest first, gaps as zeros. */
export async function readUsage(
  days: number,
  today = new Date(),
): Promise<DailyUsage[]> {
  const dates = Array.from(
    { length: days },
    (_, i) => new Date(today.getTime() - (days - 1 - i) * DAY_MS),
  );
  const pipeline = redis().pipeline();
  for (const date of dates) pipeline.hgetall(usageKey(date));
  const rows = (await pipeline.exec()) as (Record<string, unknown> | null)[];
  return dates.map((date, i) => parseDay(dateKey(date), rows[i] ?? null));
}
