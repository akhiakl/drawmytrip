import "server-only";

import type { RuntimeConfig } from "@drawmytrip/runtime-config";

import { redis } from "./redis";
import { AuditEntrySchema, type AuditEntry } from "./types";

export const AUDIT_KEY = "audit";
export const AUDIT_MAX_ENTRIES = 1000;
const DEFAULT_LIMIT = 100;

/** Newest first, trimmed to 1,000. Never throws: auditing must not block the action. */
export async function appendAudit(entry: AuditEntry): Promise<void> {
  try {
    const pipeline = redis().pipeline();
    pipeline.lpush(AUDIT_KEY, entry);
    pipeline.ltrim(AUDIT_KEY, 0, AUDIT_MAX_ENTRIES - 1);
    await pipeline.exec();
  } catch (error) {
    console.warn(
      "[admin] audit write failed",
      error instanceof Error ? error.name : typeof error,
    );
  }
}

/** Newest first; rows that no longer parse are skipped. */
export async function readAudit(limit = DEFAULT_LIMIT): Promise<AuditEntry[]> {
  const rows = await redis().lrange<unknown>(AUDIT_KEY, 0, limit - 1);
  return rows.flatMap((row) => {
    const parsed = AuditEntrySchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

function leaves(value: unknown, path: string): [string, unknown][] {
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      leaves(child, path ? `${path}.${key}` : key),
    );
  }
  return [[path, value]];
}

/** "guest.aiPerHour: 5 → 8; ai.enabled: true → false": changed leaves only. */
export function configDiff(before: RuntimeConfig, after: RuntimeConfig): string {
  const was = new Map(leaves(before, ""));
  const changes = leaves(after, "")
    .filter(([path, value]) => was.get(path) !== value)
    .map(([path, value]) => `${path}: ${was.get(path)} → ${value}`);
  return changes.length > 0 ? changes.join("; ") : "no changes";
}
