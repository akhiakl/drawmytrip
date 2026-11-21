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

/** The palette each export spells out, as files and image routes can't read CSS tokens. */
export const BRAND_COLORS = {
  light: { ink: "#16233A", brass: "#B98A2F", ground: "#F5F1E8" },
  dark: { ink: "#EDEAE2", brass: "#D4A94E", ground: "#0E1420" },
} as const;

type Colors = { ink: string; brass: string; ground: string };

/** The mark's paths and stops, in `ink`, `brass` and `ground` colors. */
function markBody({ ink, brass, ground }: Colors, detailed: boolean): string {
  const { curve, stem, start, end } = MARK;
  const stemStyle = detailed
    ? `stroke-width="${MARK.stemWidth}" stroke-dasharray="${MARK.stemDots}"`
    : 'stroke-width="4"';
  return `<path d="${curve}" stroke="${brass}" stroke-width="${MARK.curveWidth}"/>
<path d="${stem}" stroke="${ink}" ${stemStyle}/>
<circle cx="${start.cx}" cy="${start.cy}" r="${start.r}" fill="${ground}" stroke="${ink}" stroke-width="${MARK.ringWidth}"/>
<circle cx="${end.cx}" cy="${end.cy}" r="${end.r}" fill="${ink}" stroke="none"/>`;
}

const STROKES = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';

/**
 * The mark alone, tightly cropped, for the given colors: the file to hand
 * to a designer or drop in a document. `detailed` draws the stem as dots;
 * leave it off below about 40px, where dots turn to dust.
 */
export function brandMarkSvg(colors: Colors, detailed = true): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 1 52 62" role="img" aria-label="DrawMyTrip" ${STROKES}>
${markBody(colors, detailed)}
</svg>
`;
}

/**
 * The square app icon: the mark on an ink tile. Served at
 * `/icons/mark.svg` and rendered to PNG for the favicon, Apple touch and
 * PWA icons (with a solid stem at favicon size).
 */
export function brandIconSvg(detailed = true): string {
  const tile = BRAND_COLORS.light.ink;
  const colors = {
    ink: BRAND_COLORS.light.ground,
    brass: BRAND_COLORS.dark.brass,
    ground: tile,
  };
  const move = `translate(32 32) scale(.74) translate(${-MARK.centerX} -32)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="14" fill="${tile}"/>
<g transform="${move}" ${STROKES}>
${markBody(colors, detailed)}
</g>
</svg>
`;
}
