/**
 * The DrawMyTrip mark, "the route D": a brass curve (the bowl) and a stem
 * of dots between a ring (where you set out) and a filled dot (where you
 * land), drawn on a 64 unit grid. One geometry feeds the React component,
 * the poster canvas, the OG image and the icon files.
 */
export const MARK = {
  size: 64,
  curve: "M20 10 H30 C46 10 56 20 56 32 C56 44 46 54 30 54 H20",
  stem: "M20 10 V54",
  start: { cx: 20, cy: 10, r: 5.5 },
  end: { cx: 20, cy: 54, r: 5.5 },
  curveWidth: 6,
  stemWidth: 3.6,
  ringWidth: 3.4,
  /** Stem dots: a near-zero dash with round caps draws a dot every 7.2 units. */
  stemDots: "0.01 7.2",
  /** Horizontal centre of the drawn shape (the D is wider than the grid's middle). */
  centerX: 36,
} as const;

/** Colors the icon files spell out, as image routes can't read CSS tokens. */
const ICON = { tile: "#16233A", brass: "#D4A94E", paper: "#F5F1E8" } as const;

/**
 * The square app icon: the mark on an ink tile. The stem is solid, as
 * dots turn to dust at favicon size. Served at `/icons/mark.svg` and
 * rendered to PNG for the favicon, Apple touch and PWA icons.
 */
export function brandIconSvg(): string {
  const { curve, stem, start, end, curveWidth, ringWidth } = MARK;
  const { tile, brass, paper } = ICON;
  const move = `translate(32 32) scale(.74) translate(${-MARK.centerX} -32)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="14" fill="${tile}"/>
<g transform="${move}" fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="${curve}" stroke="${brass}" stroke-width="${curveWidth}"/>
<path d="${stem}" stroke="${paper}" stroke-width="4"/>
<circle cx="${start.cx}" cy="${start.cy}" r="${start.r}" fill="${tile}" stroke="${paper}" stroke-width="${ringWidth}"/>
<circle cx="${end.cx}" cy="${end.cy}" r="${end.r}" fill="${paper}" stroke="none"/>
</g>
</svg>`;
}
