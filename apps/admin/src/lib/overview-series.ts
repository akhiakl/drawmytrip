import type { RuntimeConfig } from "@drawmytrip/runtime-config";
import type { DailyUsage } from "@drawmytrip/usage";

import { daysInMonth, dayOfMonth, sum, type Flow } from "./overview-meters";
import type { DayPoint, Kpi, Meter, MonthSeries } from "./overview-types";

const cents = (value: number) => Math.round(value * 100) / 100;

export function monthSeries(meter: Meter, flow: Flow, today: Date): MonthSeries {
  const todayDom = dayOfMonth(today);
  const prefix = today.toISOString().slice(0, 8);
  let running = 0;
  const known = flow.byDate.size > 0;
  const points = Array.from({ length: daysInMonth(today) }, (_, i) => {
    const dom = i + 1;
    const date = `${prefix}${String(dom).padStart(2, "0")}`;
    running += flow.byDate.get(date) ?? 0;
    // Without daily values only today's point is known.
    let actual: number | null = null;
    if (dom <= todayDom && known) actual = running;
    else if (dom === todayDom) actual = flow.used;
    let projected: number | null = null;
    if (dom === todayDom) projected = flow.used;
    else if (dom > todayDom) projected = flow.used + flow.rate * (dom - todayDom);
    return { date, actual, projected };
  });
  return { meterId: meter.id, limit: meter.limit ?? 0, points };
}

export function dayPoint(day: DailyUsage, config: RuntimeConfig): DayPoint {
  return {
    date: day.date,
    aiGenerations: day.ai_generations,
    promptTokens: day.ai_prompt_tokens,
    completionTokens: day.ai_completion_tokens,
    costUsd: costOf(day.ai_prompt_tokens, day.ai_completion_tokens, config),
    mapViews: day.map_views,
    tripsShared: day.trips_shared,
    refusedRateLimit: day.ai_refused_rate_limit,
    provider429: day.ai_provider_429,
    refusedOther: day.ai_refused_disabled + day.trips_refused,
  };
}

function costOf(prompt: number, completion: number, config: RuntimeConfig): number {
  return cents(
    (prompt / 1e6) * config.ai.inputUsdPerMTokens +
      (completion / 1e6) * config.ai.outputUsdPerMTokens,
  );
}

export function kpisOf(
  current: readonly DailyUsage[],
  previous: readonly DailyUsage[],
  config: RuntimeConfig,
): Kpi[] {
  const total = (days: readonly DailyUsage[], pick: (day: DailyUsage) => number) =>
    sum(days.map(pick));
  const tokens = (day: DailyUsage) =>
    day.ai_prompt_tokens + day.ai_completion_tokens;
  const cost = (days: readonly DailyUsage[]) =>
    costOf(
      total(days, (d) => d.ai_prompt_tokens),
      total(days, (d) => d.ai_completion_tokens),
      config,
    );
  const kpi = (id: Kpi["id"], pick: (day: DailyUsage) => number): Kpi => ({
    id,
    value: total(current, pick),
    previous: total(previous, pick),
  });
  return [
    kpi("ai_generations", (d) => d.ai_generations),
    kpi("tokens", tokens),
    { id: "cost_usd", value: cost(current), previous: cost(previous) },
    kpi("trips_shared", (d) => d.trips_shared),
    kpi("map_views", (d) => d.map_views),
    kpi("provider_429", (d) => d.ai_provider_429),
  ];
}
