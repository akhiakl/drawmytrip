import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Fragment } from "react";

import { useUnits } from "@/components/units/units-provider";
import {
  formatDateSpan,
  stopDates,
  tripDateRange,
  tripStats,
  type Leg,
  type Trip,
} from "@/lib/trip";
import { cn } from "@/lib/utils";

import { MODE_META } from "./mode";

function Stat({
  value,
  caption,
}: {
  readonly value: string | number;
  readonly caption: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-2xl border border-line bg-card-solid px-2.5 py-2.5 lg:px-3">
      <b className="font-display text-base leading-tight font-medium wrap-break-word">
        {value}
      </b>
      <span className="text-xs text-ink-soft">{caption}</span>
    </div>
  );
}

/** The trip in four numbers (one row, even on phones), plus its dates. */
export function StatsGrid({ trip }: { readonly trip: Trip }) {
  const t = useTranslations("Trip.stats");
  const locale = useLocale();
  const stats = tripStats(trip);
  const range = tripDateRange(trip);
  const { money, distance } = useUnits();

  return (
    <div className="flex flex-col gap-2">
      {range && (
        <p className="text-sm text-ink-soft">{formatDateSpan(range, locale)}</p>
      )}
      <div className="grid grid-cols-4 gap-2">
        <Stat value={stats.nights} caption={t("nights")} />
        <Stat value={stats.cities} caption={t("cities")} />
        <Stat value={distance(stats.totalKm)} caption={t("totalRoute")} />
        <Stat
          value={t("from", { amount: money(stats.budget[0]) })}
          caption={t("budget")}
        />
      </div>
    </div>
  );
}

function LegLine({ leg }: { readonly leg: Leg }) {
  const t = useTranslations("Trip.itinerary");
  const label = useTranslations("Modes")(leg.mode);
  const { emoji } = MODE_META[leg.mode];
  return (
    <li
      aria-label={t("legLabel", { mode: label, duration: leg.duration })}
      className="ml-[25px] flex min-h-8 items-center gap-2 border-l-2 border-dashed border-brass-strong/60 pl-[27px] text-sm text-ink-soft"
    >
      <span aria-hidden>{emoji}</span>
      <span aria-hidden>
        {label} · {leg.duration}
      </span>
    </li>
  );
}

/**
 * The route as a vertical, scrollable itinerary; each stop opens its
 * detail. Hovering or focusing a row reports it (`onHover`) so the map can
 * highlight its marker, and `hoveredIndex` lights the row back up when
 * the pointer is on that marker instead.
 */
export function Itinerary({
  trip,
  selectedIndex,
  onSelect,
  hoveredIndex = null,
  onHover,
}: {
  readonly trip: Trip;
  readonly selectedIndex: number | null;
  readonly onSelect: (index: number) => void;
  readonly hoveredIndex?: number | null;
  readonly onHover?: (index: number | null) => void;
}) {
  const t = useTranslations("Trip.itinerary");
  const locale = useLocale();
  const dates = stopDates(trip);
  return (
    <ol aria-label={t("label")}>
      {trip.cities.map((city, index) => (
        <Fragment key={`${city.name}-${index}`}>
          {index > 0 && <LegLine leg={trip.legs[index - 1]} />}
          <li>
            <button
              type="button"
              onClick={() => onSelect(index)}
              onPointerEnter={() => onHover?.(index)}
              onPointerLeave={() => onHover?.(null)}
              onFocus={() => onHover?.(index)}
              onBlur={() => onHover?.(null)}
              aria-current={selectedIndex === index ? "step" : undefined}
              data-hovered={hoveredIndex === index || undefined}
              className={cn(
                "group flex min-h-15 w-full items-center gap-3 rounded-xl px-1.5 py-2 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[hovered]:bg-accent",
                selectedIndex === index && "bg-accent",
              )}
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-card-solid text-lg"
              >
                {city.flag}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  title={city.name}
                  className="block truncate font-display text-lg font-medium"
                >
                  {city.name}
                </span>
                <span className="block text-sm text-ink-soft">
                  {t("stopLine", {
                    dates: dates ? `${formatDateSpan(dates[index], locale)} · ` : "",
                    nights: city.nights,
                    country: city.country,
                  })}
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="size-4 text-ink-soft transition-transform group-hover:translate-x-0.5"
              />
            </button>
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
