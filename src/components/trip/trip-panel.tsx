"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState, type ReactNode } from "react";

import { LandingAbout } from "@/components/landing/landing-about";
import { LegalLinks } from "@/components/legal/legal-links";
import { ReportMapLink } from "@/components/legal/report-map-link";
import { usePageIdle } from "@/hooks/use-page-idle";
import { stopDates, tripMapsUrl, type Trip, type TripToolsScope } from "@/lib/trip";
import { cn } from "@/lib/utils";

import type { MapInsets } from "./fit-padding";
import {
  PrimaryActions,
  StopPager,
  ToolList,
  type ExperienceVariant,
  type ToolId,
} from "./panel-actions";
import { PanelHead, type PanelView } from "./panel-head";
import { PanelShell } from "./panel-shell";
import { Itinerary, StatsGrid } from "./route-overview";
import { SharedLinkNote } from "./shared-link-note";
import type { SheetSnap } from "./sheet-snap";
import { TopBar } from "./top-bar";
import { downloadTripCalendar } from "./trip-calendar";

// Neither is on screen at first paint: a stop's detail opens on demand and
// the tools wait for idle, so their code stays out of the startup bundle.
const CityDetail = dynamic(() =>
  import("./city-detail").then((mod) => mod.CityDetail),
);
const TripTools = dynamic(() => import("./trip-tools").then((mod) => mod.TripTools));

const TOOLS: readonly ToolId[] = ["packing", "notes"];

function ToolChips({
  tool,
  onTool,
}: {
  readonly tool: ToolId;
  readonly onTool: (tool: ToolId) => void;
}) {
  const t = useTranslations("Trip.actions");
  return (
    <div className="flex gap-2">
      {TOOLS.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={tool === id}
          onClick={() => onTool(id)}
          className={cn(
            "h-11 rounded-full border border-line px-4 text-sm font-medium text-ink-soft transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring",
            tool === id &&
              "border-ink bg-ink font-semibold text-paper hover:text-paper",
          )}
        >
          {t(id)}
        </button>
      ))}
    </div>
  );
}

/**
 * Everything about the trip that isn't the map, as three views: Route
 * (stats and itinerary), Stops (one stop in depth) and Tools (packing,
 * notes, poster and the rest). ESC steps back to Route, then lowers the
 * sheet.
 */
export function TripPanel({
  trip,
  toolsScope,
  views,
  variant,
  cta,
  selected,
  onSelect,
  hovered,
  onHover,
  view,
  onViewChange,
  onEditRoute,
  onShare,
  sharing,
  onPoster,
  onInsetsChange,
  snap,
  onSnapChange,
}: {
  readonly trip: Trip;
  /** Where this viewer's packing ticks and notes are saved. */
  readonly toolsScope: TripToolsScope;
  readonly views?: number;
  readonly variant: ExperienceVariant;
  /** The landing's own intro, shown above the example route. */
  readonly cta?: ReactNode;
  readonly selected: number | null;
  readonly onSelect: (index: number) => void;
  /** The stop under the pointer (or focus), on the map or in the list. */
  readonly hovered: number | null;
  readonly onHover: (index: number | null) => void;
  readonly view: PanelView;
  readonly onViewChange: (view: PanelView) => void;
  readonly onEditRoute: () => void;
  readonly onShare?: () => void;
  readonly sharing?: boolean;
  readonly onPoster: () => void;
  readonly onInsetsChange: (insets: MapInsets) => void;
  readonly snap: SheetSnap;
  readonly onSnapChange: (snap: SheetSnap) => void;
}) {
  const t = useTranslations("Trip.panel");
  const [tool, setTool] = useState<ToolId>("packing");
  const bodyId = useId();
  const idle = usePageIdle();
  const stop = selected ?? 0;
  const dates = stopDates(trip);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Dialogs (poster, share) own their own Escape.
      if ((event.target as Element | null)?.closest?.('[role="dialog"]')) return;
      if (view !== "route") onViewChange("route");
      else onSnapChange("peek");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [view, onViewChange, onSnapChange]);

  return (
    <PanelShell
      label={t("label")}
      snap={snap}
      onSnapChange={onSnapChange}
      bodyId={bodyId}
      onInsetsChange={onInsetsChange}
      topBar={<TopBar showMyMaps={variant !== "shared"} />}
      head={
        <PanelHead
          trip={trip}
          variant={variant}
          view={view}
          onViewChange={onViewChange}
        />
      }
      footer={
        view === "stops" ? (
          <StopPager trip={trip} index={stop} onSelect={onSelect} />
        ) : (
          <PrimaryActions
            variant={variant}
            onEditRoute={onEditRoute}
            onShare={onShare}
            sharing={sharing}
          />
        )
      }
    >
      <div className="flex flex-col gap-5 px-4 pt-2 lg:px-6">
        {view === "stops" && (
          <CityDetail
            city={trip.cities[stop]}
            index={stop}
            count={trip.cities.length}
            dates={dates?.[stop]}
            onBack={() => onViewChange("route")}
          />
        )}
        {view === "tools" && <ToolChips tool={tool} onTool={setTool} />}
        {/* Mounted once idle (or when Tools opens), then kept, so ticks and
            notes survive a detour to a stop. */}
        {(idle || view === "tools") && (
          <TripTools
            trip={trip}
            scope={toolsScope}
            active={view === "tools" ? tool : null}
          />
        )}
        {view === "tools" && (
          <ToolList
            variant={variant}
            onPoster={onPoster}
            onCalendar={dates ? () => downloadTripCalendar(trip) : undefined}
            onNavigate={() => window.open(tripMapsUrl(trip), "_blank", "noopener")}
            onEditRoute={onEditRoute}
          />
        )}
        {view === "route" && (
          <>
            {cta}
            <StatsGrid trip={trip} />
            <section aria-label={t("routeLabel")} className="flex flex-col gap-1">
              <p className="eyebrow">{t("theRoute")}</p>
              <Itinerary
                trip={trip}
                selectedIndex={selected}
                onSelect={onSelect}
                hoveredIndex={hovered}
                onHover={onHover}
              />
            </section>
            {variant === "demo" && <LandingAbout />}
            {variant === "shared" && <SharedLinkNote views={views} />}
            <LegalLinks className="border-t border-line pt-4">
              {variant === "shared" && <ReportMapLink />}
            </LegalLinks>
          </>
        )}
      </div>
    </PanelShell>
  );
}
