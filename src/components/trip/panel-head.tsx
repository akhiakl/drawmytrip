"use client";

import { useTranslations } from "next-intl";

import { useUnits } from "@/components/units/units-provider";
import { tripStats, type Trip } from "@/lib/trip";
import { cn } from "@/lib/utils";

import type { ExperienceVariant } from "./panel-actions";

/** The panel's three views, switched from its head. */
export type PanelView = "route" | "stops" | "tools";

const VIEWS: readonly PanelView[] = ["route", "stops", "tools"];

function ViewSwitch({
  view,
  onViewChange,
}: {
  readonly view: PanelView;
  readonly onViewChange: (view: PanelView) => void;
}) {
  const t = useTranslations("Trip.panel.views");
  return (
    <nav
      aria-label={t("label")}
      className="flex gap-1 rounded-full bg-secondary p-1"
    >
      {VIEWS.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          onClick={() => onViewChange(id)}
          className={cn(
            "h-10 flex-1 rounded-full text-sm font-medium text-ink-soft transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring",
            view === id && "bg-card-solid font-semibold text-ink shadow-sm",
          )}
        >
          {t(id)}
        </button>
      ))}
    </nav>
  );
}

/**
 * Always-visible top of the sheet (the peek height shows only this): what
 * the map is, the trip at a glance, and the Route / Stops / Tools switch.
 */
export function PanelHead({
  trip,
  variant,
  view,
  onViewChange,
}: {
  readonly trip: Trip;
  readonly variant: ExperienceVariant;
  readonly view: PanelView;
  readonly onViewChange: (view: PanelView) => void;
}) {
  const t = useTranslations("Trip.panel");
  // The landing's own H1 is in its call to action; the example route is a sub-heading.
  const Title = variant === "demo" ? "h2" : "h1";
  const stats = tripStats(trip);
  const { distance } = useUnits();

  return (
    <header className="flex flex-col gap-3 px-4 pt-1 pb-3 lg:px-6 lg:pt-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="eyebrow">{t(`eyebrow.${variant}`)}</p>
        <Title
          title={trip.title}
          className="truncate font-display text-2xl font-medium tracking-tight lg:text-4xl lg:leading-tight"
        >
          {trip.title}
        </Title>
        <p className="text-sm text-ink-soft">
          {t("headline", {
            nights: stats.nights,
            cities: stats.cities,
            distance: distance(stats.totalKm),
          })}
        </p>
      </div>
      <ViewSwitch view={view} onViewChange={onViewChange} />
    </header>
  );
}
