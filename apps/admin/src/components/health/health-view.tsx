import type { ServiceCheck } from "@drawmytrip/health";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shell/page-header";
import { StatusCallout } from "@/components/shell/status-callout";
import { Section } from "@/components/usage/section";
import { formatDateTime } from "@/lib/format";
import type { HealthGroups } from "@/lib/health";
import { healthHeadline } from "@/lib/health-view";

import { RecheckButton } from "./recheck-button";
import { ServiceRow } from "./service-row";

function ServiceGroup({
  id,
  title,
  hint,
  checks,
}: Readonly<{ id: string; title: string; hint: string; checks: ServiceCheck[] }>) {
  return (
    <Section id={id} title={title}>
      <p className="-mt-2 text-ink-soft">{hint}</p>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-card-solid px-4">
        {checks.map((check) => (
          <ServiceRow key={check.id} check={check} />
        ))}
      </ul>
    </Section>
  );
}

/** Live status of every service the site and the console depend on. */
export function HealthView({ health }: Readonly<{ health: HealthGroups }>) {
  const t = useTranslations("Health");
  const headline = healthHeadline(health);
  const live = [...health.site, ...health.admin].filter(
    (check) => check.status === "up" || check.status === "down",
  ).length;
  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("heading")}
        description={t("checked", { time: formatDateTime(health.checkedAt) })}
        actions={<RecheckButton label={t("recheck")} pendingLabel={t("checking")} />}
      />
      <StatusCallout
        tone={headline.tone}
        title={t(`status.${headline.tone}`, { count: headline.count })}
        body={t(`statusBody.${headline.tone}`)}
        meta={t("liveChecks", { count: live })}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ServiceGroup
          id="site-services"
          title={t("site")}
          hint={t("siteHint")}
          checks={health.site}
        />
        <ServiceGroup
          id="console-services"
          title={t("console")}
          hint={t("consoleHint")}
          checks={health.admin}
        />
      </div>
    </>
  );
}
