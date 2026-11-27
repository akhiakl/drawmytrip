import "server-only";

import * as z from "zod";

import type { Snapshot } from "../types";

/**
 * verify: field names come from memory of GET https://api.upstash.com/v2/redis/stats/{id};
 * the schema is tolerant, so a renamed field shows as missing, not as a crash.
 */
const StatsSchema = z
  .object({
    total_monthly_requests: z.number().optional(),
    total_monthly_storage: z.number().optional(),
    current_storage: z.number().optional(),
    dailyrequests: z.array(z.object({ x: z.string(), y: z.number() })).optional(),
  })
  .loose();

const MB = 1024 * 1024;

export async function collectUpstash(
  env: Record<string, string | undefined>,
  now: Date,
): Promise<Snapshot> {
  const base = {
    provider: "upstash" as const,
    fetchedAt: now.getTime(),
    daily: [],
    current: {},
  };
  const {
    UPSTASH_EMAIL: email,
    UPSTASH_API_KEY: key,
    UPSTASH_DATABASE_ID: id,
  } = env;
  if (!email || !key || !id) return { ...base, status: "not_configured" };
  try {
    const res = await fetch(`https://api.upstash.com/v2/redis/stats/${id}`, {
      headers: { authorization: `Basic ${btoa(`${email}:${key}`)}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ...base, status: "unavailable" };
    const parsed = StatsSchema.safeParse(await res.json());
    if (!parsed.success) return { ...base, status: "unavailable" };
    const stats = parsed.data;
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const daily = (stats.dailyrequests ?? [])
      .filter((point) => point.x.startsWith(month))
      .map((point) => ({
        date: point.x.slice(0, 10),
        values: { commands: point.y },
      }));
    const current: Record<string, number> = {};
    const storage = stats.current_storage ?? stats.total_monthly_storage;
    if (storage !== undefined) current.storage_mb = storage / MB;
    if (daily.length === 0 && stats.total_monthly_requests !== undefined) {
      current.commands_month = stats.total_monthly_requests;
    }
    return { ...base, status: "ok", daily, current };
  } catch {
    return { ...base, status: "unavailable" };
  }
}
