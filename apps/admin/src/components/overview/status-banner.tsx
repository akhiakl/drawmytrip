import { useTranslations } from "next-intl";

import { StatusCallout } from "@/components/shell/status-callout";
import type { Headline } from "@/lib/dashboard";

/** The one sentence an operator needs first: is any free tier at risk? */
export function StatusBanner({ headline }: Readonly<{ headline: Headline }>) {
  const t = useTranslations();
  const meter = headline.meterId ? t(`Meters.${headline.meterId}`) : "";
  return (
    <StatusCallout
      tone={headline.status}
      title={t(`Overview.status.${headline.status}`, { meter })}
      body={t(`Overview.statusBody.${headline.status}`)}
      meta={t("Overview.connected", {
        connected: headline.connected,
        total: headline.total,
      })}
    />
  );
}
