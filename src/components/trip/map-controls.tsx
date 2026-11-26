"use client";

import type { LatLngBounds } from "leaflet";
import { Maximize, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useMap } from "react-leaflet";

import { cn } from "@/lib/utils";

import { fitPadding, isMapSized, type MapInsets } from "./fit-padding";
import { MapOverlay } from "./map-overlay";

function ControlButton({
  label,
  onClick,
  className,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-11 place-items-center text-ink transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&_svg]:size-5",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Zoom and "fit route": the only controls floating on the map. Phones
 * pinch to zoom, so they get just the fit button, below the top bar.
 */
export function MapControls({
  bounds,
  insets,
}: {
  readonly bounds: LatLngBounds;
  readonly insets: MapInsets;
}) {
  const map = useMap();
  const t = useTranslations("Trip.map");

  return (
    <MapOverlay className="top-[calc(var(--map-inset-top,0px)+12px)] right-3 flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-card-solid shadow-soft">
      <ControlButton
        label={t("zoomIn")}
        onClick={() => map.zoomIn()}
        className="hidden lg:grid"
      >
        <Plus />
      </ControlButton>
      <ControlButton
        label={t("zoomOut")}
        onClick={() => map.zoomOut()}
        className="hidden lg:grid"
      >
        <Minus />
      </ControlButton>
      <ControlButton
        label={t("fitRoute")}
        onClick={() => {
          // Leaflet's fly animation yields NaN on a hidden (0×0) map.
          if (!isMapSized(map.getSize())) return;
          map.flyToBounds(bounds, {
            ...fitPadding(insets, map.getSize().y),
            duration: 0.8,
          });
        }}
      >
        <Maximize />
      </ControlButton>
    </MapOverlay>
  );
}
