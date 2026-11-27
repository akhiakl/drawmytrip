import "server-only";

import { dateKey } from "@drawmytrip/usage";

import { appendAudit } from "../audit";
import { redis } from "../redis";
import { PROVIDERS, SnapshotSchema, type Provider, type Snapshot } from "../types";
import { collectUpstash } from "./upstash";
import { collectVercel } from "./vercel";

export const SNAPSHOT_TTL_SECONDS = 400 * 24 * 60 * 60;
const snapKey = (provider: Provider, date: string) => `snap:${provider}:${date}`;

/** Fetch both providers, store today's snapshots, audit the run. */
export async function collectAll(
  env: Record<string, string | undefined>,
  now = new Date(),
): Promise<Record<Provider, Snapshot["status"]>> {
  const date = dateKey(now);
  const results = await Promise.allSettled([
    collectVercel(env, now),
    collectUpstash(env, now),
  ]);
  const statuses = {} as Record<Provider, Snapshot["status"]>;
  await Promise.all(
    results.map(async (result, index) => {
      const provider = PROVIDERS[index];
      if (result.status === "rejected") {
        statuses[provider] = "unavailable";
        return;
      }
      statuses[provider] = result.value.status;
      await redis().set(snapKey(provider, date), result.value, {
        ex: SNAPSHOT_TTL_SECONDS,
      });
    }),
  );
  await appendAudit({
    at: now.getTime(),
    actor: "cron",
    action: "usage_collected",
    detail: PROVIDERS.map((p) => `${p}: ${statuses[p]}`).join("; "),
  });
  return statuses;
}

/** Today's snapshot per provider, else yesterday's. */
export async function latestSnapshots(
  now = new Date(),
): Promise<Partial<Record<Provider, Snapshot>>> {
  const dates = [dateKey(now), dateKey(new Date(now.getTime() - 86_400_000))];
  const out: Partial<Record<Provider, Snapshot>> = {};
  await Promise.all(
    PROVIDERS.map(async (provider) => {
      for (const date of dates) {
        const raw = await redis().get<unknown>(snapKey(provider, date));
        const parsed = SnapshotSchema.safeParse(raw);
        if (parsed.success) {
          out[provider] = parsed.data;
          return;
        }
      }
    }),
  );
  return out;
}
