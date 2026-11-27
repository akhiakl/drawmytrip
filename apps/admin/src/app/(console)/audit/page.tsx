import { getTranslations } from "next-intl/server";

import { AuditTimeline } from "@/components/audit/audit-timeline";
import { PageHeader } from "@/components/shell/page-header";
import { readAudit } from "@/lib/audit";

export default async function AuditPage() {
  const [t, entries] = await Promise.all([getTranslations("Audit"), readAudit()]);
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("heading")} />
      <AuditTimeline entries={entries} />
    </>
  );
}
