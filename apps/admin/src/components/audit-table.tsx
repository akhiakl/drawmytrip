import { useTranslations } from "next-intl";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";

export function AuditTable({ entries }: Readonly<{ entries: AuditEntry[] }>) {
  const t = useTranslations("Audit");
  if (entries.length === 0) return <p className="text-ink-soft">{t("empty")}</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card-solid">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("when")}</TableHead>
            <TableHead>{t("who")}</TableHead>
            <TableHead>{t("action")}</TableHead>
            <TableHead>{t("detail")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={`${entry.at}-${entry.action}-${entry.actor}`}>
              <TableCell className="whitespace-nowrap">
                {formatDateTime(entry.at)}
              </TableCell>
              <TableCell>{entry.actor}</TableCell>
              <TableCell>{t(`actions.${entry.action}`)}</TableCell>
              <TableCell className="text-ink-soft">{entry.detail ?? ""}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
