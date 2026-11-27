/** Daily counters the web app writes and the admin reads. */
export const COUNTER_METRICS = [
  "ai_generations", // /api/generate answered 200
  "ai_failures", // /api/generate answered 5xx after calling the model
  "ai_refused_rate_limit", // our per-IP 429
  "ai_refused_disabled", // AI switched off or daily cap reached
  "ai_model_calls", // every HTTP response from the model endpoint, retries included
  "ai_prompt_tokens",
  "ai_completion_tokens",
  "ai_provider_429", // model endpoint answered 429
  "trips_shared", // /api/trips answered 201
  "trips_refused", // /api/trips answered any 4xx
  "map_views", // /t/[id] rendered a trip
] as const;

/** Last value seen that day (the provider's daily request limit and what is left). */
export const GAUGE_METRICS = ["ai_rpd_limit", "ai_rpd_remaining"] as const;

export type CounterMetric = (typeof COUNTER_METRICS)[number];
export type GaugeMetric = (typeof GAUGE_METRICS)[number];
export type DailyUsage = { date: string } & Record<
  CounterMetric | GaugeMetric,
  number
>;

export const USAGE_TTL_SECONDS = 400 * 24 * 60 * 60;

/** UTC calendar day, "2026-11-27". */
export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function usageKey(date: Date): string {
  return `usage:${dateKey(date)}`;
}

/** Every metric 0. */
export function emptyDay(date: string): DailyUsage {
  const day: Record<string, number | string> = { date };
  for (const metric of [...COUNTER_METRICS, ...GAUGE_METRICS]) day[metric] = 0;
  return day as DailyUsage;
}

/** A stored hash as a day; missing or non-numeric fields count as 0. */
export function parseDay(
  date: string,
  hash: Record<string, unknown> | null,
): DailyUsage {
  const day = emptyDay(date);
  if (!hash) return day;
  for (const metric of [...COUNTER_METRICS, ...GAUGE_METRICS]) {
    const value = Number(hash[metric]);
    if (Number.isFinite(value)) day[metric] = value;
  }
  return day;
}
