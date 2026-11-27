import type { RuntimeConfig } from "@drawmytrip/runtime-config";
import type { DailyUsage } from "@drawmytrip/usage";

import type { UsageStatus } from "./forecast";
import { PROVIDER_METERS, llmMeter, providerMeter } from "./overview-meters";
import { dayPoint, kpisOf, monthSeries } from "./overview-series";
import type { Meter, UsageOverview } from "./overview-types";
import type { Range } from "./range";
import type { Provider, Snapshot } from "./types";

export type * from "./overview-types";

const STATUS_ORDER: Record<UsageStatus, number> = {
  critical: 0,
  watch: 1,
  ok: 2,
  unknown: 3,
};

const byUrgency = (a: Meter, b: Meter) =>
  STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
  (b.ratio ?? -1) - (a.ratio ?? -1);

/** Everything the Usage page draws, from stored counters and provider snapshots. */
export function buildUsageOverview(input: {
  range: Range;
  /** `2 * range` days ending today, oldest first. */
  usage: readonly DailyUsage[];
  snapshots: Partial<Record<Provider, Snapshot>>;
  config: RuntimeConfig;
  today: Date;
}): UsageOverview {
  const { range, usage, snapshots, config, today } = input;
  const built = PROVIDER_METERS.map((spec) =>
    providerMeter(spec, snapshots[spec.provider], config, today),
  );
  const meters = [
    ...built.map((entry) => entry.meter),
    llmMeter(usage, config),
  ].sort(byUrgency);
  const month = built.flatMap(({ meter, flow }) =>
    meter.connected && flow ? [monthSeries(meter, flow, today)] : [],
  );
  const current = usage.slice(-range);
  const previous = usage.slice(0, Math.max(0, usage.length - range));
  const fetched = Object.values(snapshots).map(
    (snapshot) => snapshot?.fetchedAt ?? 0,
  );
  return {
    range,
    meters,
    days: current.map((day) => dayPoint(day, config)),
    month,
    kpis: kpisOf(current, previous, config),
    collectedAt: Math.max(0, ...fetched) || null,
  };
}
