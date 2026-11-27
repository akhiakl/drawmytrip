"use client";

import { useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCompact, formatDay } from "@/lib/format";
import type { DayPoint } from "@/lib/overview";

import { ChartCard } from "./chart-card";

export function AppUsageChart({ days }: Readonly<{ days: DayPoint[] }>) {
  const t = useTranslations("Charts");
  const config: ChartConfig = {
    mapViews: { label: t("mapViews"), color: "var(--azure)" },
    tripsShared: { label: t("shares"), color: "var(--brass-strong)" },
    aiGenerations: { label: t("aiPlans"), color: "var(--ink-soft)" },
  };
  const total = days.reduce(
    (n, d) => n + d.mapViews + d.tripsShared + d.aiGenerations,
    0,
  );
  return (
    <ChartCard
      title={t("appTitle")}
      summary={formatCompact(total)}
      empty={total === 0}
      emptyLabel={t("empty")}
    >
      <ChartContainer config={config}>
        <LineChart data={days} margin={{ left: 0, right: 8, top: 8 }}>
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
          />
          <Tooltip content={<ChartTooltipContent />} />
          {Object.keys(config).map((key) => (
            <Line
              key={key}
              dataKey={key}
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </ChartCard>
  );
}
