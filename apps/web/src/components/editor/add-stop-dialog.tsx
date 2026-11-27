"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { blankCity, GUEST_MAX_CITIES, type City } from "@/lib/trip";

import { CitySearch } from "./city-search";

/** The action bar's Add stop button; focus lands here when no stops remain. */
export const ADD_STOP_BUTTON_ID = "add-stop";

/**
 * Adding a stop: a city search that fills the screen on phones, so its
 * results stay above the keyboard, plus a blank stop to type in by hand.
 */
export function AddStopDialog({
  open,
  onOpenChange,
  count,
  onAdd,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Stops already on the route. */
  readonly count: number;
  readonly onAdd: (city: City) => void;
}) {
  const t = useTranslations("Editor.stops");
  const add = (city: City, focusId?: string) => {
    onAdd(city);
    onOpenChange(false);
    // The new row renders after the dialog hands focus back; move it on.
    if (focusId) setTimeout(() => document.getElementById(focusId)?.focus(), 50);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:justify-start max-sm:rounded-none max-sm:border-0 max-sm:bg-sheet max-sm:px-4 max-sm:pt-4">
        <div className="flex flex-col gap-1 pr-12">
          <p className="eyebrow">
            {t("position", { number: count + 1, max: GUEST_MAX_CITIES })}
          </p>
          <DialogTitle className="font-display text-2xl font-medium">
            {t("addTitle")}
          </DialogTitle>
          <DialogDescription className="text-base text-ink">
            {t("searchNext")}
          </DialogDescription>
        </div>
        <CitySearch
          onSelect={(result) =>
            add({
              ...blankCity(t("newStopName")),
              name: result.name,
              country: result.country,
              flag: result.flag,
              ll: result.ll,
            })
          }
        />
        <button
          type="button"
          onClick={() => add(blankCity(), `stop-${count}-name`)}
          className="flex min-h-12 items-center gap-2.5 rounded-lg px-1 text-left text-base text-ink-soft transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-5"
        >
          <Plus aria-hidden /> {t("addBlank")}
        </button>
      </DialogContent>
    </Dialog>
  );
}
