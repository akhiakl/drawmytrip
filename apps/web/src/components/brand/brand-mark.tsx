import { MARK } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The route D mark in theme tokens (it flips with light and dark).
 * Decorative: pair it with the wordmark or an accessible name.
 * The stem is dotted; pass `detailed={false}` below about 40px.
 */
export function BrandMark({
  className,
  detailed = true,
}: {
  readonly className?: string;
  readonly detailed?: boolean;
}) {
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
        strokeWidth={detailed ? MARK.stemWidth : 4}
        strokeDasharray={detailed ? MARK.stemDots : undefined}
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
