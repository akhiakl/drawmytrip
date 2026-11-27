import { useTranslations } from "next-intl";

import type { Meter } from "@/lib/overview";

import { MeterRow } from "./meter-row";

export function MeterList({ meters }: Readonly<{ meters: Meter[] }>) {
  const t = useTranslations("Usage");
  return (
    <section aria-labelledby="headroom" className="flex flex-col gap-3">
      <h2 id="headroom" className="font-display text-2xl text-ink">
        {t("headroom")}
      </h2>
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {meters.map((meter) => (
          <MeterRow key={meter.id} meter={meter} />
        ))}
      </ul>
    </section>
  );
}
