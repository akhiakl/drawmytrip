import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shell/page-header";
import { KpiTiles } from "@/components/usage/kpi-tiles";
import { MeterList } from "@/components/usage/meter-list";
import { Section } from "@/components/usage/section";
import { TrafficChart } from "@/components/usage/traffic-chart";
import { headlineOf } from "@/lib/dashboard";
import { formatDateTime } from "@/lib/format";
import type { UsageOverview } from "@/lib/overview";
import type { AuditEntry } from "@/lib/types";

import { RecentActivity } from "./recent-activity";
import { StatusBanner } from "./status-banner";

/** The landing screen: status, the numbers, headroom, traffic, latest changes. */
export function OverviewView({
  overview,
  activity,
}: Readonly<{ overview: UsageOverview; activity: AuditEntry[] }>) {
  const t = useTranslations();
  return (
    <>
      <PageHeader
        eyebrow={t("Overview.eyebrow")}
        title={t("Overview.heading")}
        description={
          overview.collectedAt
            ? t("Usage.collected", { time: formatDateTime(overview.collectedAt) })
            : t("Usage.neverCollected")
        }
      />
      <StatusBanner headline={headlineOf(overview.meters)} />
      <Section id="kpis" title={t("Overview.kpis")}>
        <KpiTiles kpis={overview.kpis} days={overview.days} range={overview.range} />
      </Section>
      <div className="grid gap-6 lg:grid-cols-5">
        <TrafficChart days={overview.days} className="lg:col-span-3" />
        <Section
          id="headroom"
          title={t("Overview.headroom")}
          link={{ href: "/usage", label: t("Overview.viewUsage") }}
          className="lg:col-span-2"
        >
          <MeterList meters={overview.meters} compact />
        </Section>
      </div>
      <RecentActivity entries={activity} />
    </>
  );
}
