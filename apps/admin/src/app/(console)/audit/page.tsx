import { getTranslations } from "next-intl/server";

import { AuditTable } from "@/components/audit-table";
import { readAudit } from "@/lib/audit";

export default async function AuditPage() {
  const [t, entries] = await Promise.all([getTranslations("Audit"), readAudit()]);
  return (
    <>
      <h1 className="font-display text-3xl text-ink">{t("heading")}</h1>
      <AuditTable entries={entries} />
    </>
  );
}
