import { sparkPath } from "@/lib/dashboard";

const W = 120;
const H = 32;

/** A tiny trend line, decorative (the tile states the number in words). */
export function Sparkline({ values }: Readonly<{ values: number[] }>) {
  const path = sparkPath(values, W, H);
  if (!path) return null;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden
      className="h-8 w-full overflow-visible"
    >
      <path
        d={path}
        fill="none"
        className="stroke-brass-strong"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
