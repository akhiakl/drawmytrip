import { useTranslations } from "next-intl";

import { AuditEntryRow } from "@/components/audit/audit-entry";
import { Section } from "@/components/usage/section";
import type { AuditEntry } from "@/lib/types";

export function RecentActivity({ entries }: Readonly<{ entries: AuditEntry[] }>) {
  const t = useTranslations("Overview");
  return (
    <Section
      id="activity"
      title={t("activity")}
      link={{ href: "/audit", label: t("viewAudit") }}
    >
      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-ink-soft">
          {t("noActivity")}
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-card-solid px-4">
          {entries.map((entry, i) => (
            <AuditEntryRow key={`${entry.at}-${entry.action}-${i}`} entry={entry} />
          ))}
        </ul>
      )}
    </Section>
  );
}
