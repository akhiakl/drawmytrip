"use client";

import { useTranslations } from "next-intl";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCompact, formatDay } from "@/lib/format";
import type { MonthSeries } from "@/lib/overview";

import { ChartCard } from "./chart-card";

export function MonthProgressChart({ series }: Readonly<{ series: MonthSeries }>) {
  const t = useTranslations();
  const config: ChartConfig = {
    actual: { label: t("Charts.actual"), color: "var(--azure)" },
    projected: { label: t("Charts.projectedLine"), color: "var(--brass-strong)" },
  };
  const title = t("Charts.monthTitle", { meter: t(`Meters.${series.meterId}`) });
  const last = [...series.points].reverse().find((p) => p.actual !== null);
  return (
    <ChartCard
      title={title}
      description={t("Charts.monthBody")}
      legend={config}
      summary={`${t("Charts.actual")}: ${formatCompact(last?.actual ?? 0)}, ${t("Charts.limit")}: ${formatCompact(series.limit)}`}
      empty={series.points.length === 0}
      emptyLabel={t("Charts.empty")}
    >
      <ChartContainer config={config}>
        <ComposedChart data={series.points} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompact}
            domain={[0, (max: number) => Math.max(max, series.limit * 1.05)]}
          />
          <Tooltip
            content={
              <ChartTooltipContent
                formatValue={(_key, value) => formatCompact(value)}
              />
            }
          />
          <ReferenceLine
            y={series.limit}
            stroke="var(--destructive)"
            strokeDasharray="4 4"
            label={{
              value: t("Charts.limit"),
              position: "insideTopLeft",
              fill: "var(--ink-soft)",
              fontSize: 13,
            }}
          />
          <Area
            dataKey="actual"
            stroke="var(--color-actual)"
            fill="var(--color-actual)"
            fillOpacity={0.18}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            dataKey="projected"
            stroke="var(--color-projected)"
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </ChartContainer>
    </ChartCard>
  );
}
