import { PlugZap } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Meter } from "@/lib/overview";

import { MeterRow } from "./meter-row";

/**
 * Connected meters as cards; the ones still waiting on a provider fold
 * into one quiet panel so they never outweigh live data.
 */
export function MeterList({
  meters,
  compact = false,
}: Readonly<{ meters: Meter[]; compact?: boolean }>) {
  const t = useTranslations();
  const live = meters.filter((m) => m.connected && m.limit !== null);
  const waiting = meters.filter((m) => !(m.connected && m.limit !== null));
  return (
    <div className="flex flex-col gap-3">
      {live.length > 0 ? (
        <ul
          className={
            compact ? "grid gap-3" : "grid gap-3 md:grid-cols-2 xl:grid-cols-3"
          }
        >
          {live.map((meter) => (
            <MeterRow key={meter.id} meter={meter} />
          ))}
        </ul>
      ) : null}
      {waiting.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-line p-4">
          <p className="flex items-center gap-2 font-medium text-ink">
            <PlugZap aria-hidden className="size-4 text-brass-text" />
            {t("Usage.notConnectedTitle")}
          </p>
          <p className="text-ink-soft">{t("Usage.notConnectedBody")}</p>
          <ul className="flex flex-wrap gap-2 pt-1">
            {waiting.map((meter) => (
              <li
                key={meter.id}
                className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-soft"
              >
                {t(`Meters.${meter.id}`)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
