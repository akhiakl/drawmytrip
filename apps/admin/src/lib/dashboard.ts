import type { UsageStatus } from "./forecast";
import type { DayPoint, Kpi, Meter, MeterId } from "./overview-types";

/** The one line atop the Overview: the most urgent connected meter decides it. */
export interface Headline {
  status: UsageStatus;
  meterId: MeterId | null;
  connected: number;
  total: number;
}

const RANK: Record<UsageStatus, number> = {
  critical: 0,
  watch: 1,
  ok: 2,
  unknown: 3,
};

export function headlineOf(meters: readonly Meter[]): Headline {
  const live = meters.filter((meter) => meter.connected);
  const worst = [...live].sort((a, b) => RANK[a.status] - RANK[b.status])[0];
  const urgent = worst && (worst.status === "critical" || worst.status === "watch");
  return {
    status: worst?.status ?? "unknown",
    meterId: urgent ? worst.id : null,
    connected: live.length,
    total: meters.length,
  };
}

/** Whole percent change against the previous period; null without one. */
export function kpiChange(kpi: Kpi): number | null {
  if (kpi.previous <= 0) return null;
  return Math.round(((kpi.value - kpi.previous) / kpi.previous) * 100);
}

/** KPIs where growth is bad news (spend and provider refusals). */
const UP_IS_BAD: ReadonlySet<Kpi["id"]> = new Set(["cost_usd", "provider_429"]);

export type Tone = "good" | "bad" | "flat";

/** Smaller moves than this are day-to-day noise, not news. */
export const NOTABLE_CHANGE_PCT = 5;

export function kpiTone(id: Kpi["id"], change: number | null): Tone {
  if (change === null || Math.abs(change) < NOTABLE_CHANGE_PCT) return "flat";
  return change > 0 === UP_IS_BAD.has(id) ? "bad" : "good";
}

const PICK: Record<Kpi["id"], (day: DayPoint) => number> = {
  ai_generations: (d) => d.aiGenerations,
  tokens: (d) => d.promptTokens + d.completionTokens,
  cost_usd: (d) => d.costUsd,
  trips_shared: (d) => d.tripsShared,
  map_views: (d) => d.mapViews,
  provider_429: (d) => d.provider429,
};

/** The KPI's value per day, oldest first, for its sparkline. */
export const kpiSeries = (id: Kpi["id"], days: readonly DayPoint[]): number[] =>
  days.map(PICK[id]);

/**
 * An SVG path through `values` in a `width` x `height` box (y grows down),
 * with a little room so the stroke is never clipped. Empty under two points.
 */
export function sparkPath(
  values: readonly number[],
  width: number,
  height: number,
): string {
  if (values.length < 2) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pad = 2;
  const step = width / (values.length - 1);
  return values
    .map((value, i) => {
      const x = i * step;
      const y = pad + (1 - (value - min) / span) * (height - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}
