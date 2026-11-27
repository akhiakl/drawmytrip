"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCompact, formatDay } from "@/lib/format";
import type { DayPoint } from "@/lib/overview";

import { ChartCard } from "./chart-card";

export function RefusalsChart({ days }: Readonly<{ days: DayPoint[] }>) {
  const t = useTranslations("Charts");
  const config: ChartConfig = {
    refusedRateLimit: { label: t("ourLimit"), color: "var(--azure)" },
    provider429: { label: t("provider429"), color: "var(--destructive)" },
    refusedOther: { label: t("other"), color: "var(--ink-soft)" },
  };
  const total = days.reduce(
    (n, d) => n + d.refusedRateLimit + d.provider429 + d.refusedOther,
    0,
  );
  return (
    <ChartCard
      description={t("refusalsBody")}
      legend={config}
      title={t("refusalsTitle")}
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
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltipContent />} />
          {Object.keys(config).map((key) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="r"
              fill={`var(--color-${key})`}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
