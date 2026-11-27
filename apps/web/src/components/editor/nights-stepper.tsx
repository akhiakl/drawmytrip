"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { clampNights } from "@/lib/trip";

/** Nights as a −/+ stepper: no keyboard needed on a phone. */
export function NightsStepper({
  nightsId,
  name,
  nights,
  label,
  errorId,
  onChange,
}: {
  /** Focus target for a nights problem. */
  readonly nightsId: string;
  readonly name: string;
  readonly nights: number;
  readonly label: string;
  readonly errorId?: string;
  readonly onChange: (nights: number) => void;
}) {
  const t = useTranslations("Editor.stop");
  return (
    <div
      role="group"
      aria-label={t("nightsIn", { name })}
      aria-describedby={errorId}
      className="flex shrink-0 items-center rounded-full bg-secondary"
    >
      <button
        type="button"
        aria-label={t("fewerNights", { name })}
        disabled={clampNights(nights - 1) === nights}
        onClick={() => onChange(clampNights(nights - 1))}
        className={STEP_BUTTON}
      >
        <Minus />
      </button>
      <span
        aria-live="polite"
        className="min-w-5 text-center text-base font-semibold tabular-nums"
      >
        <span className="sr-only">{label}: </span>
        {nights}
      </span>
      <button
        id={nightsId}
        type="button"
        aria-label={t("moreNights", { name })}
        disabled={clampNights(nights + 1) === nights}
        onClick={() => onChange(clampNights(nights + 1))}
        className={STEP_BUTTON}
      >
        <Plus />
      </button>
    </div>
  );
}

const STEP_BUTTON =
  "grid size-11 place-items-center rounded-full text-ink transition-colors outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 [&_svg]:size-4";
