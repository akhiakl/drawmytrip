import { GUEST_MAX_CITIES } from "@/lib/trip";

import type { GenerateRequest } from "./schema";
import { MAX_PICKS, type Pick, type Suggestions } from "./suggest-schema";

type Vibe = GenerateRequest["vibe"];

/** Days per city for a route. */
const DAYS_PER_CITY: Record<Vibe, number> = { relaxed: 4, balanced: 3, packed: 2 };
/** Places per day within one city. */
const PLACES_PER_DAY: Record<Vibe, number> = { relaxed: 1, balanced: 2, packed: 3 };
const MIN_PLACES = 3;
/** A day trip only fits a stay long enough to leave town. */
const DAYTRIP_MIN_DAYS = 4;

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

/**
 * The picks ticked before the guest touches anything, scaled to trip length
 * and pace. Suggestions are ranked, so the best fit comes first.
 */
export function preselect(
  suggestions: Suggestions,
  days: number,
  vibe: Vibe,
): Pick[] {
  const toPick = ({ name, kind }: { name: string; kind: Pick["kind"] }): Pick => ({
    name,
    kind,
  });

  if (suggestions.scope === "region") {
    const count = clamp(Math.round(days / DAYS_PER_CITY[vibe]), 1, GUEST_MAX_CITIES);
    return suggestions.candidates.slice(0, count).map(toPick);
  }

  const count = clamp(days * PLACES_PER_DAY[vibe], MIN_PLACES, MAX_PICKS);
  const dayTrip =
    days >= DAYTRIP_MIN_DAYS
      ? suggestions.candidates.find((c) => c.kind === "daytrip")
      : undefined;
  const places = suggestions.candidates
    .filter((c) => c.kind !== "daytrip")
    .slice(0, dayTrip ? count - 1 : count);
  return [...places, ...(dayTrip ? [dayTrip] : [])].map(toPick);
}
