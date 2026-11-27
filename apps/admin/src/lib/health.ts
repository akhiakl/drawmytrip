import "server-only";

import {
  HealthReportSchema,
  httpOutcome,
  notConfigured,
  probe,
  settingsCheck,
  type ServiceCheck,
} from "@drawmytrip/health";

import { redis } from "./redis";

type Env = Readonly<Record<string, string | undefined>>;

export const DEFAULT_WEB_ORIGIN = "https://drawmytrip.click";
/** The site runs its own probes in parallel, each capped at a few seconds. */
const SITE_TIMEOUT_MS = 10_000;

export interface HealthGroups {
  checkedAt: number;
  /** The site itself first, then what it reported. */
  site: ServiceCheck[];
  admin: ServiceCheck[];
}

async function siteChecks(env: Env): Promise<ServiceCheck[]> {
  const secret = env.HEALTH_CHECK_SECRET;
  if (!secret) return [notConfigured("site")];
  const origin = (env.WEB_ORIGIN || DEFAULT_WEB_ORIGIN).replace(/\/+$/, "");
  let reported: ServiceCheck[] = [];
  const site = await probe(
    "site",
    async (signal) => {
      const response = await fetch(`${origin}/api/health/services`, {
        headers: { authorization: `Bearer ${secret}` },
        signal,
        cache: "no-store",
      });
      if (!response.ok) return { ok: false, detail: `http_${response.status}` };
      const parsed = HealthReportSchema.safeParse(
        await response.json().catch(() => null),
      );
      if (!parsed.success) return { ok: false, detail: "invalid_reply" };
      reported = parsed.data.services;
      return { ok: true };
    },
    SITE_TIMEOUT_MS,
  );
  return [site, ...reported];
}

function vercelCheck(env: Env): Promise<ServiceCheck> | ServiceCheck {
  const token = env.VERCEL_API_TOKEN;
  if (!token) return notConfigured("vercel_api");
  const url = env.VERCEL_TEAM_ID
    ? `https://api.vercel.com/v2/teams/${encodeURIComponent(env.VERCEL_TEAM_ID)}`
    : "https://api.vercel.com/v2/user";
  return probe("vercel_api", (signal) =>
    httpOutcome(url, signal, { authorization: `Bearer ${token}` }),
  );
}

function upstashCheck(env: Env): Promise<ServiceCheck> | ServiceCheck {
  const {
    UPSTASH_EMAIL: email,
    UPSTASH_API_KEY: key,
    UPSTASH_DATABASE_ID: id,
  } = env;
  if (!email || !key || !id) return notConfigured("upstash_api");
  return probe("upstash_api", (signal) =>
    httpOutcome(
      `https://api.upstash.com/v2/redis/database/${encodeURIComponent(id)}`,
      signal,
      { authorization: `Basic ${btoa(`${email}:${key}`)}` },
    ),
  );
}

/** What the console itself needs: its store, usage APIs, sign-in and cron. */
async function adminChecks(env: Env): Promise<ServiceCheck[]> {
  const live = await Promise.all([
    probe("admin_store", async () => ({ ok: (await redis().ping()) === "PONG" })),
    vercelCheck(env),
    upstashCheck(env),
  ]);
  return [
    ...live,
    settingsCheck(
      "github_sign_in",
      Boolean(
        env.ADMIN_GITHUB_CLIENT_ID &&
        env.ADMIN_GITHUB_CLIENT_SECRET &&
        env.ADMIN_GITHUB_IDS &&
        env.ADMIN_SESSION_SECRET,
      ),
    ),
    settingsCheck("cron", Boolean(env.CRON_SECRET)),
  ];
}

/** Every check, run fresh on each visit to the Health page. */
export async function loadHealth(
  env: Env,
  now: () => number = Date.now,
): Promise<HealthGroups> {
  const [site, admin] = await Promise.all([siteChecks(env), adminChecks(env)]);
  return { checkedAt: now(), site, admin };
}
