"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { UpsellModal } from "@/components/upsell/upsell-modal";
import {
  MAX_PICKS,
  type Candidate,
  type PlaceKind,
  type Pick,
  type Suggestions,
} from "@/lib/ai";
import { trackEvent } from "@/lib/analytics";
import { GUEST_MAX_CITIES } from "@/lib/trip";
import { cn } from "@/lib/utils";

/** Display order and label key of each group of places. */
const GROUPS = [
  ["city", "pickCities"],
  ["sight", "pickSights"],
  ["gem", "pickGems"],
  ["food", "pickFood"],
  ["daytrip", "pickDaytrips"],
] as const satisfies readonly (readonly [PlaceKind, string])[];

function PickChip({
  candidate,
  selected,
  blocked,
  onToggle,
}: {
  readonly candidate: Candidate;
  readonly selected: boolean;
  readonly blocked: boolean;
  readonly onToggle: (candidate: Candidate) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-disabled={blocked || undefined}
      onClick={() => onToggle(candidate)}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-full border bg-card-solid px-4 text-sm font-medium text-ink transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-brass-strong" : "border-line hover:border-brass",
        blocked && "opacity-60",
      )}
    >
      {selected && <Check aria-hidden className="size-4 text-brass-text" />}
      {candidate.name}
    </button>
  );
}

/**
 * Chips for the places the AI suggested; the guest ticks what they want and
 * builds, or skips with "Surprise me". Region picks are capped at the guest
 * city limit (a tap past it opens the upsell), city picks at MAX_PICKS.
 */
export function PickStep({
  suggestions,
  initial,
  onBuild,
  onSurprise,
}: {
  readonly suggestions: Suggestions;
  readonly initial: readonly Pick[];
  readonly onBuild: (picks: Pick[]) => void;
  readonly onSurprise: () => void;
}) {
  const t = useTranslations("Chat");
  const [selected, setSelected] = useState(
    () => new Set(initial.map((pick) => pick.name)),
  );
  const [limitHit, setLimitHit] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const isRegion = suggestions.scope === "region";
  const max = isRegion ? GUEST_MAX_CITIES : MAX_PICKS;
  const atCap = selected.size >= max;

  useEffect(() => trackEvent("ai_suggestions_shown"), []);

  const toggle = ({ name }: Candidate) => {
    if (!selected.has(name) && atCap) {
      setLimitHit(true);
      if (isRegion) setUpsellOpen(true);
      return;
    }
    setLimitHit(false);
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(name)) next.add(name);
      return next;
    });
  };

  const build = () =>
    onBuild(
      GROUPS.flatMap(([kind]) =>
        suggestions.candidates.filter((c) => c.kind === kind),
      )
        .filter((c) => selected.has(c.name))
        .map(({ name, kind }) => ({ name, kind })),
    );

  return (
    <div className="flex flex-col gap-4">
      {GROUPS.map(([kind, label]) => {
        const group = suggestions.candidates.filter((c) => c.kind === kind);
        if (group.length === 0) return null;
        return (
          <div
            key={kind}
            role="group"
            aria-label={t(label)}
            className="flex flex-col gap-2"
          >
            <p className="eyebrow">{t(label)}</p>
            <div className="flex flex-wrap gap-2">
              {group.map((candidate) => (
                <PickChip
                  key={candidate.name}
                  candidate={candidate}
                  selected={selected.has(candidate.name)}
                  blocked={atCap && !selected.has(candidate.name)}
                  onToggle={toggle}
                />
              ))}
            </div>
          </div>
        );
      })}

      {limitHit && (
        <p role="status" className="text-sm text-ink">
          {t(isRegion ? "pickLimitRegion" : "pickLimitCity", { max })}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-line bg-card-solid px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-0">
        <p aria-live="polite" className="text-sm text-ink-soft sm:mr-auto">
          {t("pickCounter", { count: selected.size, max })}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={onSurprise}
          >
            {t("surprise")}
          </Button>
          <Button
            type="button"
            variant="brass"
            className="flex-1 sm:flex-none"
            disabled={selected.size === 0}
            onClick={build}
          >
            {t("build")}
          </Button>
        </div>
      </div>

      <UpsellModal open={upsellOpen} onOpenChange={setUpsellOpen} />
    </div>
  );
}
