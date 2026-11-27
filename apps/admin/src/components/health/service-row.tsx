import type { ServiceCheck, ServiceStatus } from "@drawmytrip/health";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { detailMessage, isKnownService, type KnownService } from "@/lib/health-view";

const BADGE: Record<ServiceStatus, "outline" | "danger" | "brass"> = {
  up: "outline",
  configured: "outline",
  down: "danger",
  not_configured: "brass",
};

/** One service: name and purpose, its state, and what to do when it is not up. */
export function ServiceRow({ check }: Readonly<{ check: ServiceCheck }>) {
  const t = useTranslations("Health");
  const id: KnownService | null = isKnownService(check.id) ? check.id : null;
  const detail = detailMessage(check);
  // Services that need no settings have an empty setup line.
  const setup =
    id && check.status === "not_configured" ? t(`services.${id}.setup`) : "";
  return (
    <li className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-medium text-ink">
          {id ? t(`services.${id}.name`) : check.id}
        </p>
        {id ? (
          <p className="text-[13px] text-ink-soft">{t(`services.${id}.purpose`)}</p>
        ) : null}
        {detail ? (
          <p className="text-destructive">
            {detail.key === "httpStatus"
              ? t("detail.httpStatus", { code: detail.code })
              : t(`detail.${detail.key}`)}
          </p>
        ) : null}
        {setup ? <p className="text-ink">{setup}</p> : null}
      </div>
      <div className="flex items-center gap-3 sm:justify-end">
        <Badge variant={BADGE[check.status]}>{t(`state.${check.status}`)}</Badge>
        {check.latencyMs !== undefined ? (
          <span className="text-[13px] text-ink-soft tabular-nums">
            {t("latency", { ms: check.latencyMs })}
          </span>
        ) : null}
      </div>
    </li>
  );
}
