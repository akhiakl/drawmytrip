import type { DailyUsage } from "@drawmytrip/usage";
import { makeDailyUsage } from "@drawmytrip/usage/fixtures";

import type { AuditEntry, Provider, Snapshot } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** `count` days ending at `endDate` (YYYY-MM-DD), oldest first. */
export const makeUsageDays = (
  count: number,
  endDate: string,
  perDay: Partial<DailyUsage> | ((index: number) => Partial<DailyUsage>) = {},
): DailyUsage[] =>
  Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.parse(endDate) - (count - 1 - i) * DAY_MS)
      .toISOString()
      .slice(0, 10);
    return makeDailyUsage({
      date,
      ...(typeof perDay === "function" ? perDay(i) : perDay),
    });
  });

export const makeSnapshot = (
  provider: Provider = "vercel",
  overrides: Partial<Snapshot> = {},
): Snapshot => ({
  provider,
  fetchedAt: Date.parse("2026-11-27T04:00:00Z"),
  status: "ok",
  daily: [],
  current: {},
  ...overrides,
});

/** A month-to-date snapshot with one metric growing `perDay` from day 1 to `lastDay`. */
export const makeMonthSnapshot = (
  provider: Provider,
  metric: string,
  perDay: number,
  lastDay = 27,
  overrides: Partial<Snapshot> = {},
): Snapshot =>
  makeSnapshot(provider, {
    daily: Array.from({ length: lastDay }, (_, i) => ({
      date: `2026-11-${String(i + 1).padStart(2, "0")}`,
      values: { [metric]: perDay },
    })),
    ...overrides,
  });

export const makeAuditEntry = (overrides: Partial<AuditEntry> = {}): AuditEntry => ({
  at: Date.parse("2026-11-27T10:00:00Z"),
  actor: "31401662",
  action: "sign_in",
  ...overrides,
});

/** One line of Vercel's FOCUS billing export. */
export const makeFocusLine = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  ServiceName: "Fast Data Transfer",
  ChargePeriodStart: "2026-11-26T00:00:00Z",
  ConsumedQuantity: 1.5,
  ConsumedUnit: "GB",
  ...overrides,
});

/** A fully configured admin environment for the sign-in modules. */
export const makeAdminEnv = (
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> => ({
  ADMIN_GITHUB_CLIENT_ID: "client-id",
  ADMIN_GITHUB_CLIENT_SECRET: "client-secret",
  ADMIN_GITHUB_IDS: "31401662,7",
  ADMIN_SESSION_SECRET: "s".repeat(32),
  ...overrides,
});
