import { useTranslations } from "next-intl";

import { formatCompact, formatUsd } from "@/lib/format";
import type { Kpi } from "@/lib/overview";

export function KpiTiles({ kpis, range }: Readonly<{ kpis: Kpi[]; range: number }>) {
  const t = useTranslations("Kpis");
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {kpis.map((kpi) => {
        const change =
          kpi.previous > 0
            ? Math.round(((kpi.value - kpi.previous) / kpi.previous) * 100)
            : null;
        return (
          <li
            key={kpi.id}
            className="rounded-2xl border border-line bg-card-solid p-4"
          >
            <p className="text-ink-soft">{t(kpi.id)}</p>
            <p className="font-display text-3xl text-ink tabular-nums">
              {kpi.id === "cost_usd"
                ? formatUsd(kpi.value)
                : formatCompact(kpi.value)}
            </p>
            <p className="text-ink-soft">
              {change === null
                ? t("noPrevious")
                : t("delta", {
                    sign: change > 0 ? "+" : "",
                    pct: change,
                    days: range,
                  })}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
