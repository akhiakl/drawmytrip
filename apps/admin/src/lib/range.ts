export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];
export const DEFAULT_RANGE: Range = 30;

/** The `?range=` value as a supported range; anything else is the default. */
export function parseRange(value: string | undefined): Range {
  const parsed = Number(value);
  return RANGES.find((range) => range === parsed) ?? DEFAULT_RANGE;
}
