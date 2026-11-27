"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { MapOverlay } from "./map-overlay";

/**
 * Phones fold the map credits (OpenFreeMap, OpenMapTiles, OpenStreetMap)
 * behind an "i" button so they don't take two lines above the sheet; the
 * button shows them in Leaflet's own attribution control. From `lg` the
 * credits always show and the button hides (see `.atlas-map` in
 * globals.css).
 */
export function MapAttribution() {
  const t = useTranslations("Trip.map");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const credits = ref.current
      ?.closest(".leaflet-container")
      ?.querySelector(".leaflet-control-attribution");
    credits?.classList.toggle("is-open", open);
  }, [open]);

  return (
    <MapOverlay className="bottom-[calc(var(--map-inset-bottom,0px)+0.5rem)] left-3 lg:hidden">
      <button
        ref={ref}
        type="button"
        aria-expanded={open}
        aria-label={open ? t("hideCredits") : t("showCredits")}
        onClick={() => setOpen((current) => !current)}
        className="grid size-11 place-items-center rounded-full border border-line bg-card-solid text-ink-soft shadow-soft transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-5"
      >
        <Info aria-hidden />
      </button>
    </MapOverlay>
  );
}
