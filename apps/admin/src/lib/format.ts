const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const plain = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });

/** 1,200,000 -> "1.2M"; small numbers keep one decimal at most. */
export const formatCompact = (value: number): string =>
  Math.abs(value) >= 10_000 ? compact.format(value) : plain.format(value);

export const formatUsd = (value: number): string =>
  `$${value.toFixed(value >= 100 ? 0 : 2)}`;

/** "2026-11-27" -> "Nov 27", independent of the viewer's time zone. */
export function formatDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
}

export const formatDateTime = (ms: number): string =>
  `${new Date(ms).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  })} UTC`;
