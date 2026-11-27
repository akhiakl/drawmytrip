import { useTranslations } from "next-intl";

import { formatDateTime } from "@/lib/format";
import type { UsageOverview } from "@/lib/overview";

import { AppUsageChart } from "./app-usage-chart";
import { KpiTiles } from "./kpi-tiles";
import { MeterList } from "./meter-list";
import { MonthProgressChart } from "./month-progress-chart";
import { RangeSwitch } from "./range-switch";
import { RefusalsChart } from "./refusals-chart";
import { TokensChart } from "./tokens-chart";

export function UsageView({ overview }: Readonly<{ overview: UsageOverview }>) {
  const t = useTranslations("Usage");
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl text-ink">{t("heading")}</h1>
        <div className="ml-auto">
          <RangeSwitch range={overview.range} />
        </div>
      </div>
      <p className="text-ink-soft">
        {overview.collectedAt
          ? t("collected", { time: formatDateTime(overview.collectedAt) })
          : t("neverCollected")}
      </p>
      <MeterList meters={overview.meters} />
      <KpiTiles kpis={overview.kpis} range={overview.range} />
      <div className="grid gap-4 lg:grid-cols-2">
        {overview.month.map((series) => (
          <MonthProgressChart key={series.meterId} series={series} />
        ))}
        <TokensChart days={overview.days} />
        <AppUsageChart days={overview.days} />
        <RefusalsChart days={overview.days} />
      </div>
    </>
  );
}
