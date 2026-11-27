export type UsageStatus = "ok" | "watch" | "critical" | "unknown";

export const WATCH_RATIO = 0.7;
export const CRITICAL_RATIO = 0.9;

/** Whole days left in the month after `today` (UTC). */
export function remainingDaysUtc(today: Date): number {
  const lastDay = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return lastDay - today.getUTCDate();
}

const mean = (values: readonly number[]): number =>
  values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;

/** Month to date plus the last days' average for every day left. */
export function projectMonthEnd(
  monthToDate: number,
  lastDaily: readonly number[],
  today: Date,
): number {
  return monthToDate + mean(lastDaily) * remainingDaysUtc(today);
}

/** Days until the limit at the current daily rate; 0 when already there, null when not growing. */
export function daysUntilLimit(
  monthToDate: number,
  dailyRate: number,
  limit: number,
): number | null {
  if (monthToDate >= limit) return 0;
  if (dailyRate <= 0) return null;
  return Math.ceil((limit - monthToDate) / dailyRate);
}

export function statusFor(ratio: number | null): UsageStatus {
  if (ratio === null) return "unknown";
  if (ratio >= CRITICAL_RATIO) return "critical";
  if (ratio >= WATCH_RATIO) return "watch";
  return "ok";
}

export { mean };
