"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCompact, formatDay, formatUsd } from "@/lib/format";
import type { DayPoint } from "@/lib/overview";

import { ChartCard } from "./chart-card";

export function TokensChart({ days }: Readonly<{ days: DayPoint[] }>) {
  const t = useTranslations("Charts");
  const config: ChartConfig = {
    promptTokens: { label: t("input"), color: "var(--azure)" },
    completionTokens: { label: t("output"), color: "var(--brass-strong)" },
  };
  const total = days.reduce((n, d) => n + d.promptTokens + d.completionTokens, 0);
  return (
    <ChartCard
      title={t("tokensTitle")}
      summary={formatCompact(total)}
      empty={total === 0}
      emptyLabel={t("empty")}
    >
      <ChartContainer config={config}>
        <BarChart data={days} margin={{ left: 0, right: 8, top: 8 }}>
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
          <Tooltip
            content={
              <ChartTooltipContent
                formatValue={(_key, value) => formatCompact(value)}
                extra={(rows) => {
                  const point = rows[0]?.payload as DayPoint | undefined;
                  return point ? `${t("cost")}: ${formatUsd(point.costUsd)}` : null;
                }}
              />
            }
          />
          <Bar
            dataKey="promptTokens"
            stackId="t"
            fill="var(--color-promptTokens)"
            isAnimationActive={false}
          />
          <Bar
            dataKey="completionTokens"
            stackId="t"
            fill="var(--color-completionTokens)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
