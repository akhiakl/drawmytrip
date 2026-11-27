"use client";

import { useTranslations } from "next-intl";
import { Area, AreaChart, Tooltip, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCompact, formatDay } from "@/lib/format";
import type { DayPoint } from "@/lib/overview";

import { ChartCard } from "./chart-card";

type SeriesKey = "mapViews" | "aiGenerations" | "tripsShared";

const SERIES: {
  key: SeriesKey;
  label: "mapViews" | "aiPlans" | "shares";
  color: string;
}[] = [
  { key: "mapViews", label: "mapViews", color: "var(--azure)" },
  { key: "aiGenerations", label: "aiPlans", color: "var(--brass-strong)" },
  { key: "tripsShared", label: "shares", color: "var(--ink-soft)" },
];

/**
 * Map views, AI plans and shares as small multiples: each on its own axis,
 * so a few hundred views never flatten a dozen shares into the floor.
 */
export function TrafficChart({
  days,
  className,
}: Readonly<{ days: DayPoint[]; className?: string }>) {
  const t = useTranslations("Charts");
  const totals = SERIES.map(({ key }) => days.reduce((n, d) => n + d[key], 0));
  const all = totals.reduce((n, v) => n + v, 0);
  return (
    <ChartCard
      title={t("appTitle")}
      description={t("appBody")}
      summary={SERIES.map(
        (s, i) => `${t(s.label)}: ${formatCompact(totals[i])}`,
      ).join(", ")}
      empty={all === 0}
      emptyLabel={t("empty")}
      className={className}
    >
      <div className="flex flex-col gap-4">
        {SERIES.map((series, i) => {
          const config: ChartConfig = {
            [series.key]: { label: t(series.label), color: series.color },
          };
          const last = i === SERIES.length - 1;
          return (
            <div key={series.key} className="flex flex-col gap-1">
              <p className="flex items-baseline gap-2 text-ink">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: series.color }}
                />
                {t(series.label)}
                <span className="ml-auto font-display text-lg tabular-nums">
                  {formatCompact(totals[i])}
                </span>
              </p>
              <ChartContainer config={config} className={last ? "h-24" : "h-16"}>
                <AreaChart
                  data={days}
                  margin={{ left: 0, right: 4, top: 4, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    hide={!last}
                    tickFormatter={formatDay}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={32}
                  />
                  <YAxis hide domain={[0, "dataMax"]} />
                  <Tooltip
                    content={
                      <ChartTooltipContent
                        formatValue={(_k, v) => formatCompact(v)}
                      />
                    }
                  />
                  <Area
                    dataKey={series.key}
                    type="monotone"
                    stroke={`var(--color-${series.key})`}
                    strokeWidth={2}
                    fill={`var(--color-${series.key})`}
                    fillOpacity={0.14}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
