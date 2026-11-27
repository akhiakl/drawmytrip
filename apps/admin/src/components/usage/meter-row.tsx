import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { formatCompact } from "@/lib/format";
import type { Meter } from "@/lib/overview";
import { cn } from "@/lib/utils";

const BAR: Record<Meter["status"], string> = {
  ok: "bg-azure",
  watch: "bg-brass-strong",
  critical: "bg-destructive",
  unknown: "bg-line",
};

/** One connected meter: used against the limit, with the month-end projection marked. */
export function MeterRow({ meter }: Readonly<{ meter: Meter }>) {
  const t = useTranslations();
  const unit = (value: number) =>
    t(`Units.${meter.unit}`, { value: formatCompact(value) });
  const limit = meter.limit ?? 0;
  const pct = (value: number) => (limit ? Math.min(100, (value / limit) * 100) : 0);
  const over = meter.ratio !== null && meter.ratio > 1;
  const projectedPct = meter.projected === null ? null : pct(meter.projected);

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line bg-card-solid p-4">
      <div className="flex items-start gap-2">
        <h3 className="text-base font-medium text-ink">{t(`Meters.${meter.id}`)}</h3>
        <Badge
          variant={
            meter.status === "critical" || meter.status === "watch"
              ? "brass"
              : "outline"
          }
          className="ml-auto"
        >
          {t(`Usage.status.${meter.status}`)}
        </Badge>
      </div>
      <p className="font-display text-2xl leading-none text-ink tabular-nums">
        {Math.round(pct(meter.used))}%
      </p>
      <div
        role="meter"
        aria-label={t(`Meters.${meter.id}`)}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(meter.used, limit)}
        aria-valuetext={`${unit(meter.used)} / ${unit(limit)}`}
        className="relative h-2 rounded-full bg-secondary"
      >
        <div
          className={cn("h-full rounded-full", BAR[meter.status])}
          style={{ width: `${pct(meter.used)}%` }}
        />
        {projectedPct !== null ? (
          <span
            aria-hidden
            className="absolute -top-1 h-4 w-0.5 rounded-full bg-ink"
            style={{ left: `calc(${projectedPct}% - 1px)` }}
          />
        ) : null}
      </div>
      <p className="text-ink-soft">
        {t("Usage.used", { used: unit(meter.used), limit: unit(limit) })}
        {meter.ratio !== null
          ? ` · ${t("Usage.projected", { pct: Math.round(meter.ratio * 100) })}`
          : ""}
      </p>
      {over ? <p className="text-destructive">{t("Usage.over")}</p> : null}
      {!over && meter.daysLeft !== null ? (
        <p className="text-ink-soft">
          {t("Usage.daysLeft", { days: Math.max(0, Math.round(meter.daysLeft)) })}
        </p>
      ) : null}
    </li>
  );
}
