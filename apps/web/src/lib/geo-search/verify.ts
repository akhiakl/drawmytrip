import { haversineKm, type LatLng } from "@/lib/trip";

import { PhotonFeatureSchema } from "./schema";

/**
 * Checks that a place an AI named really exists near where it said. Looks
 * the name up in Photon (OpenStreetMap) biased to the claimed spot and
 * accepts a hit only within `radiusKm` of it. Photon's coordinates win, so
 * map points come from real data, not model guesses.
 */

const SEARCH_URL = "https://photon.komoot.io/api/";
const RESULT_LIMIT = 3;
const CITY_LAYERS = ["city", "locality"];
const USER_AGENT = "DrawMyTrip (https://drawmytrip.click)";

export interface PlaceCheck {
  name: string;
  /** Where the model said the place is. */
  ll: LatLng;
  /** How far a hit may sit from `ll` and still count. */
  radiusKm: number;
  /** Search settlement layers only, for cities. */
  settlement?: boolean;
}

/** Photon's coordinates for the place, or null when it can't be confirmed. */
export async function locatePlace(
  { name, ll, radiusKm, settlement }: PlaceCheck,
  options: { signal?: AbortSignal } = {},
): Promise<LatLng | null> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", name);
  url.searchParams.set("limit", String(RESULT_LIMIT));
  url.searchParams.set("lat", String(ll[0]));
  url.searchParams.set("lon", String(ll[1]));
  if (settlement) {
    for (const layer of CITY_LAYERS) url.searchParams.append("layer", layer);
  }

  try {
    const response = await fetch(url, {
      signal: options.signal,
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    });
    if (!response.ok) return null;
    const raw = (await response.json()) as { features?: unknown };
    if (!Array.isArray(raw.features)) return null;

    for (const item of raw.features) {
      const parsed = PhotonFeatureSchema.safeParse(item);
      if (!parsed.success) continue;
      const [lng, lat] = parsed.data.geometry.coordinates;
      if (haversineKm(ll, [lat, lng]) <= radiusKm) return [lat, lng];
    }
    return null;
  } catch {
    return null;
  }
}
