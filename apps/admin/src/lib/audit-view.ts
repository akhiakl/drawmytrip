import type { AuditEntry } from "./types";

export interface AuditDay {
  /** YYYY-MM-DD in UTC. */
  day: string;
  entries: AuditEntry[];
}

/** Newest-first entries in runs of one UTC day, keeping their order. */
export function groupAuditByDay(entries: readonly AuditEntry[]): AuditDay[] {
  const days: AuditDay[] = [];
  for (const entry of entries) {
    const day = new Date(entry.at).toISOString().slice(0, 10);
    const last = days.at(-1);
    if (last?.day === day) last.entries.push(entry);
    else days.push({ day, entries: [entry] });
  }
  return days;
}

/** The daily job writes as "cron"; everyone else is a GitHub id. */
export const isCron = (actor: string): boolean => actor === "cron";
