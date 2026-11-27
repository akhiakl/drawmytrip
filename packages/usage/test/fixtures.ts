import { emptyDay, type DailyUsage } from "../src/metrics";

export const makeDailyUsage = (overrides: Partial<DailyUsage> = {}): DailyUsage => ({
  ...emptyDay(overrides.date ?? "2026-11-27"),
  ...overrides,
});
