import {
  httpOutcome,
  notConfigured,
  probe,
  settingsCheck,
  type HealthReport,
  type ProbeOutcome,
  type ServiceCheck,
} from "@drawmytrip/health";
import * as z from "zod";

import { PHOTON_SEARCH_URL } from "@/lib/geo-search";
import { DEFAULT_RATES_URL } from "@/lib/units";

type Env = Readonly<Record<string, string | undefined>>;

export interface SiteHealthDeps {
  env: Env;
  /** The trip store ping (the service layer stays out of lib). */
  pingStore: () => Promise<boolean>;
  mapStyleUrl: string;
}

const ModelListSchema = z.object({ data: z.array(z.object({ id: z.string() })) });

/**
 * The model list costs no tokens on OpenAI-compatible providers. When the
 * list parses, the configured model must be in it, so a typo in AI_MODEL
 * shows up here instead of as failed trips.
 */
async function aiOutcome(env: Env, signal: AbortSignal): Promise<ProbeOutcome> {
  const base = (env.AI_BASE_URL ?? "").replace(/\/+$/, "");
  const response = await fetch(`${base}/models`, {
    headers: env.AI_API_KEY ? { authorization: `Bearer ${env.AI_API_KEY}` } : {},
    signal,
    cache: "no-store",
  });
  if (!response.ok) return { ok: false, detail: `http_${response.status}` };
  const list = ModelListSchema.safeParse(await response.json().catch(() => null));
  if (list.success && !list.data.data.some((model) => model.id === env.AI_MODEL)) {
    return { ok: false, detail: "model_missing" };
  }
  return { ok: true };
}

const photonUrl = () => {
  const url = new URL(PHOTON_SEARCH_URL);
  url.searchParams.set("q", "Paris");
  url.searchParams.set("limit", "1");
  return url.toString();
};

/**
 * Every service the site depends on, checked in parallel. Live probes for
 * the store, AI provider, geocoder, rates and basemap; settings only for
 * the log and error sinks, which would record a ping as real traffic.
 */
export async function checkSiteServices(
  { env, pingStore, mapStyleUrl }: SiteHealthDeps,
  now: () => number = Date.now,
): Promise<HealthReport> {
  const aiReady = Boolean(env.AI_BASE_URL && env.AI_MODEL);
  const live: Promise<ServiceCheck>[] = [
    probe("redis", async () => ({ ok: await pingStore() })),
    aiReady
      ? probe("ai", (signal) => aiOutcome(env, signal))
      : Promise.resolve(notConfigured("ai")),
    probe("geocoding", (signal) => httpOutcome(photonUrl(), signal)),
    probe("rates", (signal) =>
      httpOutcome(env.RATES_API_URL || DEFAULT_RATES_URL, signal),
    ),
    probe("map", (signal) => httpOutcome(mapStyleUrl, signal)),
  ];
  const services = [
    ...(await Promise.all(live)),
    settingsCheck(
      "logs",
      Boolean(env.BETTER_STACK_SOURCE_TOKEN && env.BETTER_STACK_INGESTING_URL),
    ),
    settingsCheck("errors", Boolean(env.NEXT_PUBLIC_SENTRY_DSN)),
  ];
  return { checkedAt: now(), services };
}
