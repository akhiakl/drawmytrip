import * as z from "zod";

export const AUDIT_ACTIONS = [
  "sign_in",
  "sign_in_denied",
  "config_saved",
  "usage_collected",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AuditEntrySchema = z.object({
  at: z.number(),
  /** GitHub id, or "cron". */
  actor: z.string().max(40),
  action: z.enum(AUDIT_ACTIONS),
  detail: z.string().max(2000).optional(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

export const PROVIDERS = ["vercel", "upstash"] as const;
export const ProviderSchema = z.enum(PROVIDERS);
export type Provider = z.infer<typeof ProviderSchema>;

/**
 * What one provider's usage API said, saved once a day.
 * Metric ids: vercel `transfer_gb`, `cpu_hours`, `analytics_events`;
 * upstash `commands`, `storage_mb` (and `commands_month` when only a monthly
 * total exists).
 */
export const SnapshotSchema = z.object({
  provider: ProviderSchema,
  fetchedAt: z.number(),
  status: z.enum(["ok", "not_configured", "unavailable"]),
  /** This month's days, oldest first. */
  daily: z.array(
    z.object({ date: z.string(), values: z.record(z.string(), z.number()) }),
  ),
  /** Point-in-time values. */
  current: z.record(z.string(), z.number()),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;
