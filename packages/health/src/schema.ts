import * as z from "zod";

/**
 * `up` / `down` come from a live probe; `configured` means the settings are
 * present but the service is not pinged (log and error sinks, OAuth);
 * `not_configured` means its settings are missing.
 */
export const ServiceStatusSchema = z.enum(["up", "down", "configured", "not_configured"]);
export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;

export const ServiceCheckSchema = z.object({
  id: z.string().min(1).max(40),
  status: ServiceStatusSchema,
  latencyMs: z.number().int().nonnegative().optional(),
  /** A short fixed code (`timeout`, `http_503`), never an upstream body. */
  detail: z.string().max(60).optional(),
});
export type ServiceCheck = z.infer<typeof ServiceCheckSchema>;

export const HealthReportSchema = z.object({
  checkedAt: z.number().int(),
  services: z.array(ServiceCheckSchema).max(20),
});
export type HealthReport = z.infer<typeof HealthReportSchema>;

export interface HealthSummary {
  status: "ok" | "degraded";
  down: number;
  notConfigured: number;
}

/** Degraded as soon as one live probe fails; missing settings only count. */
export function summarize(checks: readonly ServiceCheck[]): HealthSummary {
  const down = checks.filter((check) => check.status === "down").length;
  const notConfigured = checks.filter(
    (check) => check.status === "not_configured",
  ).length;
  return { status: down > 0 ? "degraded" : "ok", down, notConfigured };
}
