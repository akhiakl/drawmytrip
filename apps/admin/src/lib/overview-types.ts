import type { UsageStatus } from "./forecast";
import type { Range } from "./range";

export type MeterId =
  | "vercel_transfer"
  | "vercel_cpu"
  | "vercel_events"
  | "upstash_commands"
  | "upstash_storage"
  | "llm_requests_day";

export type MeterUnit = "gb" | "hours" | "events" | "commands" | "mb" | "requests";

export interface Meter {
  id: MeterId;
  unit: MeterUnit;
  used: number;
  projected: number | null;
  limit: number | null;
  ratio: number | null;
  status: UsageStatus;
  daysLeft: number | null;
  connected: boolean;
}

export interface DayPoint {
  date: string;
  aiGenerations: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  mapViews: number;
  tripsShared: number;
  refusedRateLimit: number;
  provider429: number;
  refusedOther: number;
}

export interface MonthSeries {
  meterId: MeterId;
  limit: number;
  points: { date: string; actual: number | null; projected: number | null }[];
}

export interface Kpi {
  id:
    | "ai_generations"
    | "tokens"
    | "cost_usd"
    | "trips_shared"
    | "map_views"
    | "provider_429";
  value: number;
  previous: number;
}

export interface UsageOverview {
  range: Range;
  meters: Meter[];
  days: DayPoint[];
  month: MonthSeries[];
  kpis: Kpi[];
  collectedAt: number | null;
}
