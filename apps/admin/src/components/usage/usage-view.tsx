import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shell/page-header";
import { formatDateTime } from "@/lib/format";
import type { UsageOverview } from "@/lib/overview";

import { KpiTiles } from "./kpi-tiles";
import { MeterList } from "./meter-list";
import { MonthProgressChart } from "./month-progress-chart";
import { RangeSwitch } from "./range-switch";
import { RefusalsChart } from "./refusals-chart";
import { Section } from "./section";
import { TokensChart } from "./tokens-chart";
import { TrafficChart } from "./traffic-chart";

export function UsageView({ overview }: Readonly<{ overview: UsageOverview }>) {
  const t = useTranslations("Usage");
  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("heading")}
        description={
          overview.collectedAt
            ? t("collected", { time: formatDateTime(overview.collectedAt) })
            : t("neverCollected")
        }
        actions={<RangeSwitch range={overview.range} />}
      />
      <KpiTiles kpis={overview.kpis} days={overview.days} range={overview.range} />
      <Section id="headroom" title={t("headroom")}>
        <MeterList meters={overview.meters} />
      </Section>
      <Section id="trends" title={t("charts")}>
        <div className="grid gap-4 lg:grid-cols-2">
          <TrafficChart days={overview.days} className="lg:col-span-2" />
          {overview.month.map((series) => (
            <MonthProgressChart key={series.meterId} series={series} />
          ))}
          <TokensChart days={overview.days} />
          <RefusalsChart days={overview.days} />
        </div>
      </Section>
    </>
  );
}
