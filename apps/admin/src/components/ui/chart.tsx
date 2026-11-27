"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";

import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Series label and colour; the colour becomes `--color-{key}` inside the chart. */
export type ChartConfig = Record<string, { label: string; color: string }>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error("useChart must be used inside a ChartContainer");
  return context;
}

/**
 * Sizes a Recharts chart to its box and hands series colours to it as CSS
 * variables, so colours stay design tokens (never hex in a chart).
 */
function ChartContainer({
  config,
  className,
  children,
  ...props
}: Readonly<
  Omit<React.ComponentProps<"div">, "children"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof ResponsiveContainer>["children"];
  }
>) {
  const colors = Object.fromEntries(
    Object.entries(config).map(([key, { color }]) => [`--color-${key}`, color]),
  ) as React.CSSProperties;
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        style={colors}
        className={cn(
          "h-52 w-full text-[13px] [&_.recharts-cartesian-axis-tick_text]:fill-ink-soft [&_.recharts-cartesian-grid_line]:stroke-line [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

interface TooltipRow {
  dataKey?: string | number;
  value?: number | string;
  /** The hovered data point. */
  payload?: unknown;
}

/** Recharts clones this element with the hovered point's data. */
function ChartTooltipContent({
  active,
  payload,
  label,
  formatValue,
  extra,
}: Readonly<{
  active?: boolean;
  payload?: readonly TooltipRow[];
  label?: string | number;
  formatValue?: (key: string, value: number) => string;
  /** One more line under the rows (a derived figure such as cost). */
  extra?: (point: readonly TooltipRow[]) => string | null;
}>) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;
  const note = extra?.(payload);
  return (
    <div className="rounded-xl border border-line bg-card-solid px-3 py-2 text-[13px] shadow-soft">
      <p className="mb-1 font-medium text-ink">
        {typeof label === "string" ? formatDay(label) : label}
      </p>
      {payload.map((row) => {
        const key = String(row.dataKey);
        const series = config[key];
        if (!series || row.value === undefined || row.value === null) return null;
        const value = Number(row.value);
        return (
          <p key={key} className="flex items-center gap-2 text-ink">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ background: `var(--color-${key})` }}
            />
            <span className="text-ink-soft">{series.label}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums">
              {formatValue ? formatValue(key, value) : value.toLocaleString("en")}
            </span>
          </p>
        );
      })}
      {note ? <p className="mt-1 text-ink-soft">{note}</p> : null}
    </div>
  );
}

/** The series key: a dot in each series' colour and its label. */
function ChartLegend({ config }: Readonly<{ config: ChartConfig }>) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-soft">
      {Object.entries(config).map(([key, { label, color }]) => (
        <li key={key} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ background: color }}
          />
          {label}
        </li>
      ))}
    </ul>
  );
}

export { ChartContainer, ChartLegend, ChartTooltipContent, useChart };
