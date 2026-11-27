import { useTranslations } from "next-intl";

import { groupAuditByDay } from "@/lib/audit-view";
import type { AuditEntry } from "@/lib/types";

import { AuditEntryRow } from "./audit-entry";

const dayLabel = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

/** Entries in runs of one UTC day, newest first; phones read it without sideways scroll. */
export function AuditTimeline({ entries }: Readonly<{ entries: AuditEntry[] }>) {
  const t = useTranslations("Audit");
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line p-6 text-center text-ink-soft">
        {t("empty")}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {groupAuditByDay(entries).map(({ day, entries: rows }) => (
        <section
          key={day}
          aria-labelledby={`day-${day}`}
          className="flex flex-col gap-2"
        >
          <h2 id={`day-${day}`} className="flex items-baseline gap-2">
            <span className="eyebrow">{dayLabel(day)}</span>
            <span className="text-[13px] text-ink-soft">
              {t("entries", { count: rows.length })}
            </span>
          </h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-card-solid px-4">
            {rows.map((entry, i) => (
              <AuditEntryRow
                key={`${entry.at}-${entry.action}-${i}`}
                entry={entry}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
