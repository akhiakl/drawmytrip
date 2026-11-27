import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useTranslations } from "next-intl";

import { kpiChange, kpiSeries, kpiTone } from "@/lib/dashboard";
import { formatCompact, formatUsd } from "@/lib/format";
import type { DayPoint, Kpi } from "@/lib/overview";
import { cn } from "@/lib/utils";

import { Sparkline } from "./sparkline";

const ARROW = { [-1]: ArrowDownRight, 0: Minus, 1: ArrowUpRight } as const;
const DELTA = { [-1]: "down", 0: "same", 1: "up" } as const;

export function KpiTiles({
  kpis,
  days,
  range,
}: Readonly<{ kpis: Kpi[]; days: DayPoint[]; range: number }>) {
  const t = useTranslations("Kpis");
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {kpis.map((kpi) => {
        const change = kpiChange(kpi);
        const tone = kpiTone(kpi.id, change);
        const direction = Math.sign(change ?? 0) as -1 | 0 | 1;
        const Arrow = ARROW[direction];
        const delta =
          change === null
            ? t("noPrevious")
            : t(DELTA[direction], { pct: Math.abs(change), days: range });
        return (
          <li
            key={kpi.id}
            className="flex min-w-0 flex-col gap-2 rounded-2xl border border-line bg-card-solid p-4"
          >
            <p className="text-ink-soft">{t(kpi.id)}</p>
            <p className="font-display text-3xl leading-none font-medium text-ink tabular-nums">
              {kpi.id === "cost_usd"
                ? formatUsd(kpi.value)
                : formatCompact(kpi.value)}
            </p>
            <Sparkline values={kpiSeries(kpi.id, days)} />
            <p
              className={cn(
                "flex items-start gap-1 text-[13px]",
                tone === "bad" ? "text-destructive" : "text-ink-soft",
              )}
            >
              <Arrow aria-hidden className="mt-0.5 size-4 shrink-0" />
              {delta}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
