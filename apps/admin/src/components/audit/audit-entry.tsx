import { Clock, LogIn, ShieldX, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { isCron } from "@/lib/audit-view";
import type { AuditEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON = {
  sign_in: LogIn,
  sign_in_denied: ShieldX,
  config_saved: SlidersHorizontal,
  usage_collected: Clock,
} as const;

const time = (ms: number) =>
  new Date(ms).toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

/** One audit row: what happened, who did it, the UTC time and any detail. */
export function AuditEntryRow({ entry }: Readonly<{ entry: AuditEntry }>) {
  const t = useTranslations("Audit");
  const Icon = ICON[entry.action];
  const denied = entry.action === "sign_in_denied";
  return (
    <li className="flex gap-3 py-3">
      <span
        aria-hidden
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full border border-line",
          denied ? "text-destructive" : "text-brass-text",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="flex flex-wrap items-baseline gap-x-2 text-ink">
          <span className="font-medium">{t(`actions.${entry.action}`)}</span>
          <span className="text-[13px] text-ink-soft">
            {isCron(entry.actor) ? t("cron") : t("github", { id: entry.actor })}
          </span>
        </p>
        {entry.detail ? (
          <p className="font-mono text-[13px] break-words text-ink-soft">
            {entry.detail}
          </p>
        ) : null}
      </div>
      <time
        dateTime={new Date(entry.at).toISOString()}
        className="shrink-0 pt-0.5 text-[13px] text-ink-soft tabular-nums"
      >
        {time(entry.at)} UTC
      </time>
    </li>
  );
}
