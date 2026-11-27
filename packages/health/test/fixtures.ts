import type { HealthReport, ServiceCheck } from "../src/schema";

export const makeServiceCheck = (overrides: Partial<ServiceCheck> = {}): ServiceCheck => ({
  id: "redis",
  status: "up",
  latencyMs: 42,
  ...overrides,
});

export const makeHealthReport = (overrides: Partial<HealthReport> = {}): HealthReport => ({
  checkedAt: Date.parse("2026-11-27T20:00:00Z"),
  services: [makeServiceCheck()],
  ...overrides,
});
