import { MARK } from "@drawmytrip/brand";

import { cn } from "@/lib/utils";

/**
 * The route D mark in theme tokens, as on the public site. Decorative:
 * pair it with the wordmark or an accessible name.
 */
export function BrandMark({ className }: Readonly<{ className?: string }>) {
  const { curve, stem, start, end } = MARK;
  return (
    <svg
      viewBox={`0 0 ${MARK.size} ${MARK.size}`}
      aria-hidden
      className={cn("size-7 shrink-0 overflow-visible", className)}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={curve} className="stroke-brass" strokeWidth={MARK.curveWidth} />
      <path
        d={stem}
        className="stroke-ink"
        strokeWidth={MARK.stemWidth}
        strokeDasharray={MARK.stemDots}
      />
      <circle
        {...start}
        className="fill-paper stroke-ink"
        strokeWidth={MARK.ringWidth}
      />
      <circle {...end} className="fill-ink" stroke="none" />
    </svg>
  );
}
