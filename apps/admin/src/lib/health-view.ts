import { summarize, type ServiceCheck } from "@drawmytrip/health";

import type { HealthGroups } from "./health";

export interface HealthHeadline {
  tone: "ok" | "watch" | "critical";
  /** Services down (critical) or not set up (watch). */
  count: number;
}

/** Down beats not set up; everything answering is ok. */
export function healthHeadline({ site, admin }: HealthGroups): HealthHeadline {
  const { down, notConfigured } = summarize([...site, ...admin]);
  if (down > 0) return { tone: "critical", count: down };
  if (notConfigured > 0) return { tone: "watch", count: notConfigured };
  return { tone: "ok", count: 0 };
}

export type DetailMessage =
  | { key: "httpStatus"; code: string }
  | { key: "timeout" | "modelMissing" | "invalidReply" | "unreachable" };

/** A probe's fixed failure code as a message key; unknown codes read as unreachable. */
export function detailMessage(check: ServiceCheck): DetailMessage | null {
  if (check.status !== "down") return null;
  const http = /^http_(\d{3})$/.exec(check.detail ?? "");
  if (http) return { key: "httpStatus", code: http[1]! };
  switch (check.detail) {
    case "timeout":
      return { key: "timeout" };
    case "model_missing":
      return { key: "modelMissing" };
    case "invalid_reply":
      return { key: "invalidReply" };
    default:
      return { key: "unreachable" };
  }
}

/** Services with copy in `Health.services`; others show their raw id. */
export const KNOWN_SERVICES = [
  "site",
  "redis",
  "ai",
  "geocoding",
  "rates",
  "map",
  "logs",
  "errors",
  "admin_store",
  "vercel_api",
  "upstash_api",
  "github_sign_in",
  "cron",
] as const;
export type KnownService = (typeof KNOWN_SERVICES)[number];

export const isKnownService = (id: string): id is KnownService =>
  (KNOWN_SERVICES as readonly string[]).includes(id);
