import "server-only";

import { getRuntimeConfig } from "@drawmytrip/runtime-config/store";
import { readUsage } from "@drawmytrip/usage/record";

import { latestSnapshots } from "./collect";
import { buildUsageOverview, type UsageOverview } from "./overview";
import type { Range } from "./range";

export async function loadUsageOverview(
  range: Range,
  now = new Date(),
): Promise<UsageOverview> {
  const [config, usage, snapshots] = await Promise.all([
    getRuntimeConfig(),
    readUsage(range * 2, now),
    latestSnapshots(now),
  ]);
  return buildUsageOverview({ range, usage, snapshots, config, today: now });
}
