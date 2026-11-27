import { ChartLegend, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

/**
 * A titled chart panel with its legend; `summary` is the same data in words
 * for screen readers.
 */
export function ChartCard({
  title,
  description,
  legend,
  summary,
  empty,
  emptyLabel,
  className,
  children,
}: Readonly<{
  title: string;
  description?: string;
  legend?: ChartConfig;
  summary: string;
  empty: boolean;
  emptyLabel: string;
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-card-solid p-4 sm:p-5",
        className,
      )}
    >
      <header className="flex flex-col gap-1">
        <h3 className="font-display text-lg font-medium text-ink">{title}</h3>
        {description ? <p className="text-ink-soft">{description}</p> : null}
        {legend && !empty ? (
          <div className="pt-1">
            <ChartLegend config={legend} />
          </div>
        ) : null}
      </header>
      {empty ? (
        <p className="grid min-h-40 place-items-center rounded-xl bg-muted px-4 text-center text-ink-soft">
          {emptyLabel}
        </p>
      ) : (
        <div role="img" aria-label={`${title}. ${summary}`}>
          {children}
        </div>
      )}
    </section>
  );
}
