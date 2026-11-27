import "server-only";

import type { Snapshot } from "../types";

/**
 * FOCUS service name (lowercase, contains) -> metric id.
 * verify: field and service names come from memory of Vercel's
 * GET /v1/billing/charges FOCUS export; check against a real response.
 */
export const VERCEL_SERVICE_MAP: readonly [string, string][] = [
  ["data transfer", "transfer_gb"],
  ["cpu", "cpu_hours"],
  ["analytics", "analytics_events"],
];

const TO_GB: Record<string, number> = {
  b: 1e-9,
  kb: 1e-6,
  mb: 1e-3,
  gb: 1,
  tb: 1e3,
};
const TO_HOURS: Record<string, number> = {
  s: 1 / 3600,
  sec: 1 / 3600,
  second: 1 / 3600,
  seconds: 1 / 3600,
  m: 1 / 60,
  min: 1 / 60,
  minute: 1 / 60,
  minutes: 1 / 60,
  h: 1,
  hr: 1,
  hour: 1,
  hours: 1,
};

function convert(metric: string, quantity: number, unit: string): number {
  const key = unit.trim().toLowerCase();
  if (metric === "transfer_gb") return quantity * (TO_GB[key] ?? 1);
  if (metric === "cpu_hours") return quantity * (TO_HOURS[key] ?? 1);
  return quantity;
}

const metricFor = (service: string): string | undefined => {
  const name = service.toLowerCase();
  return VERCEL_SERVICE_MAP.find(([needle]) => name.includes(needle))?.[1];
};

/** Parse the JSONL body into per-day metric totals. Bad lines are skipped. */
export function parseFocus(body: string): Snapshot["daily"] {
  const days = new Map<string, Record<string, number>>();
  for (const line of body.split("\n")) {
    if (!line.trim()) continue;
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    const metric = metricFor(String(row.ServiceName ?? ""));
    const quantity = Number(row.ConsumedQuantity);
    const start = String(row.ChargePeriodStart ?? "");
    if (!metric || !Number.isFinite(quantity) || !/^\d{4}-\d{2}-\d{2}/.test(start))
      continue;
    const date = start.slice(0, 10);
    const values = days.get(date) ?? {};
    values[metric] =
      (values[metric] ?? 0) +
      convert(metric, quantity, String(row.ConsumedUnit ?? ""));
    days.set(date, values);
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, values }));
}

export async function collectVercel(
  env: Record<string, string | undefined>,
  now: Date,
): Promise<Snapshot> {
  const base = {
    provider: "vercel" as const,
    fetchedAt: now.getTime(),
    daily: [],
    current: {},
  };
  const token = env.VERCEL_API_TOKEN;
  if (!token) return { ...base, status: "not_configured" };
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const url = new URL("https://api.vercel.com/v1/billing/charges");
  url.searchParams.set("from", from.toISOString());
  url.searchParams.set("to", now.toISOString());
  if (env.VERCEL_TEAM_ID) url.searchParams.set("teamId", env.VERCEL_TEAM_ID);
  try {
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ...base, status: "unavailable" };
    return { ...base, status: "ok", daily: parseFocus(await res.text()) };
  } catch {
    return { ...base, status: "unavailable" };
  }
}
