import type { RuntimeConfig } from "@drawmytrip/runtime-config";
import type { DailyUsage } from "@drawmytrip/usage";

import {
  daysUntilLimit,
  mean,
  projectMonthEnd,
  remainingDaysUtc,
  statusFor,
} from "./forecast";
import type { Meter, MeterId, MeterUnit } from "./overview-types";
import type { Provider, Snapshot } from "./types";

export interface ProviderMeter {
  id: MeterId;
  provider: Provider;
  metric: string;
  unit: MeterUnit;
  limit: (config: RuntimeConfig) => number;
  /** A level, not a flow: used is the current value and nothing is projected. */
  level?: boolean;
}

export const PROVIDER_METERS: readonly ProviderMeter[] = [
  {
    id: "vercel_transfer",
    provider: "vercel",
    metric: "transfer_gb",
    unit: "gb",
    limit: (c) => c.freeTier.vercelTransferGb,
  },
  {
    id: "vercel_cpu",
    provider: "vercel",
    metric: "cpu_hours",
    unit: "hours",
    limit: (c) => c.freeTier.vercelCpuHours,
  },
  {
    id: "vercel_events",
    provider: "vercel",
    metric: "analytics_events",
    unit: "events",
    limit: (c) => c.freeTier.vercelAnalyticsEvents,
  },
  {
    id: "upstash_commands",
    provider: "upstash",
    metric: "commands",
    unit: "commands",
    limit: (c) => c.freeTier.upstashCommands,
  },
  {
    id: "upstash_storage",
    provider: "upstash",
    metric: "storage_mb",
    unit: "mb",
    limit: (c) => c.freeTier.upstashStorageMb,
    level: true,
  },
];

export const LAST_DAYS = 7;
export const sum = (values: readonly number[]) =>
  values.reduce((total, v) => total + v, 0);

export const dayOfMonth = (today: Date) => today.getUTCDate();
export const daysInMonth = (today: Date) =>
  dayOfMonth(today) + remainingDaysUtc(today);

export interface Flow {
  used: number;
  projected: number;
  daysLeft: number | null;
  /** Per-day values this month, by date, when the provider gave them. */
  byDate: Map<string, number>;
  rate: number;
}

/** A month-to-date flow from daily values, or from a monthly total alone. */
function flowOf(
  spec: ProviderMeter,
  snapshot: Snapshot,
  limit: number,
  today: Date,
): Flow {
  const values = snapshot.daily.map((entry) => entry.values[spec.metric] ?? 0);
  const byDate = new Map(
    snapshot.daily.map((entry) => [entry.date, entry.values[spec.metric] ?? 0]),
  );
  const total = snapshot.current.commands_month;
  if (values.length === 0 && spec.metric === "commands" && total !== undefined) {
    const rate = total / dayOfMonth(today);
    return {
      used: total,
      projected: total + rate * remainingDaysUtc(today),
      daysLeft: daysUntilLimit(total, rate, limit),
      byDate,
      rate,
    };
  }
  const used = sum(values);
  const rate = mean(values.slice(-LAST_DAYS));
  return {
    used,
    projected: projectMonthEnd(used, values.slice(-LAST_DAYS), today),
    daysLeft: daysUntilLimit(used, rate, limit),
    byDate,
    rate,
  };
}

export function providerMeter(
  spec: ProviderMeter,
  snapshot: Snapshot | undefined,
  config: RuntimeConfig,
  today: Date,
): { meter: Meter; flow: Flow | null } {
  const limit = spec.limit(config);
  const base = { id: spec.id, unit: spec.unit, limit };
  if (!snapshot || snapshot.status !== "ok") {
    return {
      meter: {
        ...base,
        used: 0,
        projected: null,
        ratio: null,
        status: "unknown",
        daysLeft: null,
        connected: false,
      },
      flow: null,
    };
  }
  if (spec.level) {
    const used = snapshot.current[spec.metric] ?? 0;
    const ratio = used / limit;
    return {
      meter: {
        ...base,
        used,
        projected: used,
        ratio,
        status: statusFor(ratio),
        daysLeft: null,
        connected: true,
      },
      flow: null,
    };
  }
  const flow = flowOf(spec, snapshot, limit, today);
  const ratio = flow.projected / limit;
  return {
    meter: {
      ...base,
      used: flow.used,
      projected: flow.projected,
      ratio,
      status: statusFor(ratio),
      daysLeft: flow.daysLeft,
      connected: true,
    },
    flow,
  };
}

export function llmMeter(
  usage: readonly DailyUsage[],
  config: RuntimeConfig,
): Meter {
  const recent = usage.slice(-LAST_DAYS);
  const used = Math.max(0, ...recent.map((day) => day.ai_model_calls));
  const reported = [...recent]
    .reverse()
    .find((day) => day.ai_rpd_limit > 0)?.ai_rpd_limit;
  const configured = config.freeTier.llmRequestsPerDay;
  const limit = reported ?? (configured > 0 ? configured : null);
  const ratio = limit === null ? null : used / limit;
  return {
    id: "llm_requests_day",
    unit: "requests",
    used,
    projected: used,
    limit,
    ratio,
    status: statusFor(ratio),
    daysLeft: null,
    connected: true,
  };
}
