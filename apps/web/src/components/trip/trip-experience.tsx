"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { usePageIdle } from "@/hooks/use-page-idle";
import { useShareTrip } from "@/hooks/use-share-trip";
import {
  saveLocalTrip,
  stopDates,
  tripStats,
  type Trip,
  type TripToolsScope,
} from "@/lib/trip";

import type { MapInsets } from "./fit-padding";
import { IntroSplash } from "./intro-splash";
import type { ExperienceVariant } from "./panel-actions";
import type { PanelView } from "./panel-head";
import { PrintItinerary } from "./print-itinerary";
import type { SheetSnap } from "./sheet-snap";
import { downloadTripCalendar } from "./trip-calendar";
import { TripMap } from "./trip-map";
import { TripPanel } from "./trip-panel";

// Closed until asked for: load after first paint, outside hydration.
const PosterDialog = dynamic(() =>
  import("./poster-dialog").then((mod) => mod.PosterDialog),
);
const ShareDialog = dynamic(() =>
  import("@/components/share/share-dialog").then((mod) => mod.ShareDialog),
);

const noop = () => {};

/** Where a viewer's packing and notes are saved for the hosting page. */
function toolsScopeFor(
  actions: ExperienceVariant,
  ids: { localId?: string; shareId?: string },
): TripToolsScope {
  if (actions === "shared" && ids.shareId)
    return { kind: "shared", id: ids.shareId };
  if (actions === "own" && ids.localId) return { kind: "local", id: ids.localId };
  return { kind: "demo" };
}

/**
 * The product view: a full-bleed map under the trip panel (phones: a top
 * bar, a three-height sheet and an action bar; desktop: one side card);
 * the panel reports the map `insets` it covers so fits and pans stay clear.
 * Receives the trip via props; no data fetching happens below this line. Hosted by three pages, each passing
 * its own `actions` variant (see `ExperienceVariant`): the example route
 * (`/`), a Shared View (`/t/[id]`), and Map View (`/maps/[id]`).
 */
export function TripExperience({
  trip,
  actions = "demo",
  localId,
  shareId,
  views,
  cta,
}: {
  readonly trip: Trip;
  readonly actions?: ExperienceVariant;
  /** The trip's local-store id, when `actions="own"` — lets "Edit" update
   * this same record in place instead of forking a new copy. */
  readonly localId?: string;
  /** The snapshot id, when `actions="shared"` (`/t/{id}`). */
  readonly shareId?: string;
  /** How many times the shared link has been opened, this visit included. */
  readonly views?: number;
  /** The landing's own intro, shown above the example route. */
  readonly cta?: ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("Trip");
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<PanelView>("route");
  // The stop under the pointer/focus, mirrored between list row and marker.
  const [hovered, setHovered] = useState<number | null>(null);
  const [posterOpen, setPosterOpen] = useState(false);
  const [insets, setInsets] = useState<MapInsets>({});
  // Dialogs and the print-only itinerary aren't needed for first paint.
  const idle = usePageIdle();
  const [snap, setSnap] = useState<SheetSnap>("peek");

  // Any view needs room: a lowered sheet rises to half to show it.
  const changeView = (next: PanelView) => {
    setView(next);
    setSnap((current) => (current === "peek" ? "half" : current));
  };

  // Picking a stop (map or itinerary) opens it in the Stops view. The
  // list it was hovered in goes away, so drop the hover with it.
  const selectCity = (index: number) => {
    setSelected(index);
    setHovered(null);
    changeView("stops");
  };

  const stats = tripStats(trip);
  const toolsScope = toolsScopeFor(actions, { localId, shareId });
  const route = trip.cities.map((city) => city.name).join(" → ");

  const {
    share,
    sharing,
    shareId: sharedId,
    sharedTitle,
    dialogOpen,
    setDialogOpen,
  } = useShareTrip({
    // Local trips are already within the guest city limit by construction,
    // so the 403 branch this would gate is unreachable here.
    onCityLimit: noop,
  });

  // "Edit"/"Customize"/"Remix this trip" all copy the (possibly read-only)
  // trip into a local draft and open the editor. Owning a `localId` (Map
  // View) means updating that same record in place; otherwise (example
  // route, Shared View) it forks a fresh copy.
  const handleEditRoute = () => {
    const id = saveLocalTrip(
      { ...trip, createdAt: localId ? trip.createdAt : Date.now() },
      localId,
    );
    router.push(`/new?remix=${id}`);
  };

  return (
    <>
      <div className="relative isolate h-dvh w-full overflow-hidden print:hidden">
        <TripPanel
          trip={trip}
          toolsScope={toolsScope}
          views={views}
          variant={actions}
          cta={cta}
          selected={selected}
          onSelect={selectCity}
          hovered={hovered}
          onHover={setHovered}
          view={view}
          onViewChange={changeView}
          onEditRoute={handleEditRoute}
          onShare={() => void share(trip, localId)}
          sharing={sharing}
          onPoster={() => setPosterOpen(true)}
          onInsetsChange={setInsets}
          snap={snap}
          onSnapChange={setSnap}
        />

        <main aria-label={t("map.label")} className="absolute inset-0 z-0">
          <TripMap
            trip={trip}
            selectedIndex={view === "stops" ? (selected ?? 0) : null}
            onCitySelect={selectCity}
            hoveredIndex={hovered}
            onCityHover={setHovered}
            onBackgroundClick={() => setSnap("peek")}
            insets={insets}
          />
        </main>

        {idle && (
          <PosterDialog trip={trip} open={posterOpen} onOpenChange={setPosterOpen} />
        )}
        {idle && actions === "own" && (
          <ShareDialog
            shareId={sharedId}
            title={sharedTitle}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onPoster={() => setPosterOpen(true)}
            onCalendar={
              stopDates(trip) ? () => downloadTripCalendar(trip) : undefined
            }
          />
        )}

        <IntroSplash
          title={trip.title}
          eyebrow={t("summary", {
            nights: stats.nights,
            cities: stats.cities,
            countries: stats.countries,
          })}
          route={route}
        />
      </div>
      {idle && <PrintItinerary trip={trip} />}
    </>
  );
}
