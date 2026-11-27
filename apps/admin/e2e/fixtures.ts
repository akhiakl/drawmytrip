import { test as base, expect } from "@playwright/test";
import { SignJWT } from "jose";

import { ADMIN_ID, FAKE_UPSTASH_PORT, SESSION_SECRET } from "./env";

/** A session cookie the admin accepts, signed like the real one. */
export async function signedSession(githubId = ADMIN_ID): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("drawmytrip-admin")
    .setAudience("admin")
    .setSubject(String(githubId))
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(new TextEncoder().encode(SESSION_SECRET));
}

/** Thirty days of plausible counters straight into the fake Redis. */
export async function seedUsage(days = 30): Promise<void> {
  const commands: string[][] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const n = 20 + ((i * 7) % 15);
    commands.push([
      "HSET",
      `usage:${date}`,
      "ai_generations",
      String(n),
      "ai_rpd_limit",
      "14400",
      "ai_rpd_remaining",
      "14000",
      "ai_model_calls",
      String(n + 3),
      "ai_prompt_tokens",
      String(n * 900),
      "ai_completion_tokens",
      String(n * 400),
      "map_views",
      String(n * 12),
      "trips_shared",
      String(Math.round(n / 3)),
      "ai_refused_rate_limit",
      String(i % 4),
      "ai_provider_429",
      String(i % 9 === 0 ? 2 : 0),
    ]);
  }
  await fetch(`http://127.0.0.1:${FAKE_UPSTASH_PORT}/pipeline`, {
    method: "POST",
    body: JSON.stringify(commands),
  });
}

export const test = base.extend({
  page: async ({ page, baseURL }, provide) => {
    await page.context().addCookies([
      {
        name: "dmt_admin",
        value: await signedSession(),
        url: baseURL!,
      },
    ]);
    await provide(page);
  },
});

export { expect };
