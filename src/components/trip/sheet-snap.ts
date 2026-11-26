/** The mobile sheet's three resting heights. */
export type SheetSnap = "peek" | "half" | "full";

export type SnapHeights = Readonly<Record<SheetSnap, number>>;

const ORDER: readonly SheetSnap[] = ["peek", "half", "full"];
/** Half shows this share of the screen. */
const HALF_RATIO = 0.58;
/** Flick speed (px/s) that moves one step regardless of distance. */
const FLICK_VELOCITY = 500;

/**
 * Visible sheet height (px) at each snap: peek shows just the head,
 * half 58% of the screen, full the whole sheet (it stops below the top bar).
 */
export function snapHeights({
  viewport,
  sheet,
  peek,
}: {
  readonly viewport: number;
  readonly sheet: number;
  readonly peek: number;
}): SnapHeights {
  const full = Math.max(sheet, peek);
  const half = Math.min(full, Math.max(peek, Math.round(viewport * HALF_RATIO)));
  return { peek, half, full };
}

/**
 * Where a drag settles: a flick moves one step in its direction, a slow
 * drag rests at the nearest height. `offsetY` is the drag distance in px
 * (negative = up, i.e. taller).
 */
export function nextSnap(
  current: SheetSnap,
  offsetY: number,
  velocityY: number,
  heights: SnapHeights,
): SheetSnap {
  const index = ORDER.indexOf(current);
  if (Math.abs(velocityY) >= FLICK_VELOCITY) {
    const step = velocityY < 0 ? 1 : -1;
    return ORDER[Math.min(ORDER.length - 1, Math.max(0, index + step))];
  }
  const shown = heights[current] - offsetY;
  return ORDER.reduce((best, snap) =>
    Math.abs(heights[snap] - shown) < Math.abs(heights[best] - shown) ? snap : best,
  );
}

/**
 * Map area the sheet covers, for fitting the route. At full the map is
 * mostly hidden anyway, so it keeps the half-height fit instead of
 * squeezing the route into a sliver.
 */
export function visibleHeight(snap: SheetSnap, heights: SnapHeights): number {
  return snap === "full" ? heights.half : heights[snap];
}
