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

export function MeterRow({ meter }: Readonly<{ meter: Meter }>) {
  const t = useTranslations();
  const unit = (value: number) =>
    t(`Units.${meter.unit}`, { value: formatCompact(value) });
  const ratio = meter.ratio ?? 0;
  const pct = Math.round(ratio * 100);
  const filled = meter.limit
    ? Math.min(100, Math.round((meter.used / meter.limit) * 100))
    : 0;

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-line bg-card-solid p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-medium text-ink">{t(`Meters.${meter.id}`)}</h3>
        <Badge
          variant={meter.status === "critical" ? "brass" : "outline"}
          className="ml-auto"
        >
          {t(`Usage.status.${meter.status}`)}
        </Badge>
      </div>
      {meter.connected && meter.limit !== null ? (
        <>
          <div
            role="meter"
            aria-label={t(`Meters.${meter.id}`)}
            aria-valuemin={0}
            aria-valuemax={meter.limit}
            aria-valuenow={Math.min(meter.used, meter.limit)}
            aria-valuetext={`${unit(meter.used)} / ${unit(meter.limit)}`}
            className="h-2.5 overflow-hidden rounded-full bg-secondary"
          >
            <div
              className={cn("h-full rounded-full", BAR[meter.status])}
              style={{ width: `${filled}%` }}
            />
          </div>
          <p className="text-ink-soft">
            {unit(meter.used)} / {unit(meter.limit)}
            {meter.projected !== null && meter.ratio !== null
              ? ` · ${t("Usage.projected", { pct })}`
              : ""}
          </p>
          {meter.ratio !== null && meter.ratio > 1 ? (
            <p className="text-destructive">{t("Usage.over")}</p>
          ) : null}
          {meter.daysLeft !== null ? (
            <p className="text-ink-soft">
              {t("Usage.daysLeft", {
                days: Math.max(0, Math.round(meter.daysLeft)),
              })}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-ink-soft">{t("Usage.notConnected")}</p>
      )}
    </li>
  );
}
