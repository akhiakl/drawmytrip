"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  GUEST_MAX_CITIES,
  indexAfterMove,
  indexAfterRemove,
  legDistanceKm,
  type City,
  type DraftIssues,
  type Leg,
} from "@/lib/trip";

import { ADD_STOP_BUTTON_ID } from "./add-stop-dialog";
import { LegRow } from "./leg-row";
import { StopRow } from "./stop-row";
import { useStopDrag } from "./use-stop-drag";

export function StopList({
  cities,
  keys,
  legs,
  onRemoveCity,
  onMoveCity,
  onUpdateCity,
  onUpdateLeg,
  canAddCity,
  onLimitReached,
  issues = {},
  activeIndex = null,
  onActivate,
}: {
  readonly cities: City[];
  /** Stable per-stop ids (`DraftTrip.keys`), so rows follow their stop. */
  readonly keys: readonly string[];
  readonly legs: Leg[];
  readonly onRemoveCity: (index: number) => void;
  readonly onMoveCity: (from: number, to: number) => void;
  readonly onUpdateCity: (index: number, patch: Partial<City>) => void;
  readonly onUpdateLeg: (index: number, patch: Partial<Leg>) => void;
  readonly canAddCity: boolean;
  readonly onLimitReached: () => void;
  readonly issues?: DraftIssues;
  /** The stop being edited; the map preview follows it. */
  readonly activeIndex?: number | null;
  readonly onActivate?: (index: number) => void;
}) {
  const t = useTranslations("Editor.stops");
  const issueText = useTranslations("Editor.issues");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // Focus a control once React has rendered the change that creates it.
  const focusAfterRender = (find: () => HTMLElement | null | undefined) =>
    requestAnimationFrame(() => find()?.focus());

  // The open detail panel follows its stop through reorders and deletes,
  // and screen readers hear where the stop went.
  const moveCity = (from: number, to: number) => {
    onMoveCity(from, to);
    setAnnouncement(
      t("moved", {
        name: cities[from]?.name || t("newStopName"),
        position: to + 1,
        count: cities.length,
      }),
    );
    setExpandedIndex((current) =>
      current === null ? null : indexAfterMove(current, from, to),
    );
  };

  // The row moves with its stop; focus follows to its menu button.
  const moveWithMenu = (from: number, to: number) => {
    moveCity(from, to);
    focusAfterRender(() => document.getElementById(`stop-${to}-menu`));
  };

  const issueAt = (path: string) => {
    const key = issues[path];
    return key ? issueText(key) : undefined;
  };

  // The removed row took focus with it: land on the stop that slid into
  // its place (or the new last stop), or the search when none are left.
  const removeCity = (index: number) => {
    onRemoveCity(index);
    const left = cities.length - 1;
    focusAfterRender(() =>
      left > 0
        ? document.getElementById(`stop-${Math.min(index, left - 1)}-menu`)
        : document.getElementById(ADD_STOP_BUTTON_ID),
    );
    setExpandedIndex((current) =>
      current === null ? null : indexAfterRemove(current, index),
    );
  };

  const drag = useStopDrag(moveCity);

  return (
    <div className="flex flex-col gap-2">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {cities.map((city, index) => (
        <div key={keys[index]} onFocusCapture={() => onActivate?.(index)}>
          <StopRow
            city={city}
            index={index}
            count={cities.length}
            expanded={expandedIndex === index}
            onToggleExpand={() =>
              setExpandedIndex((current) => (current === index ? null : index))
            }
            onChange={(patch) => onUpdateCity(index, patch)}
            onRemove={() => removeCity(index)}
            onMoveUp={() => moveWithMenu(index, index - 1)}
            onMoveDown={() => moveWithMenu(index, index + 1)}
            {...drag.rowProps(index)}
            dragging={drag.dragged === index}
            dropSide={drag.dropSide(index)}
            gripProps={drag.gripProps(index)}
            active={activeIndex === index}
            errors={{
              name: issueAt(`cities.${index}.name`),
              nights: issueAt(`cities.${index}.nights`),
            }}
          />
          {index < legs.length && (
            <LegRow
              leg={legs[index]}
              index={index}
              km={legDistanceKm(city, cities[index + 1])}
              onChange={(patch) => onUpdateLeg(index, patch)}
            />
          )}
        </div>
      ))}

      {!canAddCity && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-line p-3">
          <p className="text-sm text-ink">{t("limit", { max: GUEST_MAX_CITIES })}</p>
          <Button type="button" variant="outline" size="sm" onClick={onLimitReached}>
            {t("seeUnlocks")}
          </Button>
        </div>
      )}
    </div>
  );
}
