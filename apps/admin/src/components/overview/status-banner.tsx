import { CircleAlert, CircleCheck, CircleDashed, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Headline } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

const ICON = {
  ok: CircleCheck,
  watch: TriangleAlert,
  critical: CircleAlert,
  unknown: CircleDashed,
} as const;

const SURFACE = {
  ok: "border-line bg-card-solid",
  watch: "border-brass/40 bg-accent",
  critical: "border-destructive/40 bg-destructive/5",
  unknown: "border-line bg-card-solid",
} as const;

/** The one sentence an operator needs first: is any free tier at risk? */
export function StatusBanner({ headline }: Readonly<{ headline: Headline }>) {
  const t = useTranslations();
  const Icon = ICON[headline.status];
  const meter = headline.meterId ? t(`Meters.${headline.meterId}`) : "";
  return (
    <section
      aria-live="polite"
      className={cn("flex gap-4 rounded-2xl border p-5", SURFACE[headline.status])}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-1 size-6 shrink-0",
          headline.status === "critical" ? "text-destructive" : "text-brass-text",
        )}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-display text-xl font-medium text-ink lg:text-2xl">
          {t(`Overview.status.${headline.status}`, { meter })}
        </h2>
        <p className="text-ink">{t(`Overview.statusBody.${headline.status}`)}</p>
        <p className="text-[13px] text-ink-soft">
          {t("Overview.connected", {
            connected: headline.connected,
            total: headline.total,
          })}
        </p>
      </div>
    </section>
  );
}
