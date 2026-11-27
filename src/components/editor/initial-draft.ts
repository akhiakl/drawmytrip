import { readAiHandoff, type GenerateRequest } from "@/lib/ai";
import {
  addCity,
  createBlankDraft,
  draftFromTrip,
  getLocalTrip,
  startCityFromParams,
  type DraftTrip,
} from "@/lib/trip";

/**
 * Where the editor starts: a saved map (`?remix=`), the AI handoff
 * (`?from=ai`), a destination picked on the landing (`?city=`), or blank.
 */
export function resolveInitialState(searchParams: URLSearchParams): {
  draft: DraftTrip;
  localId: string | null;
  createdAt: number;
  ghostNames: string[];
  request: GenerateRequest | undefined;
} {
  const remixId = searchParams.get("remix");
  if (remixId) {
    const record = getLocalTrip(remixId);
    if (record) {
      return {
        draft: draftFromTrip(record.trip),
        localId: remixId,
        createdAt: record.trip.createdAt,
        ghostNames: [] as string[],
        request: undefined,
      };
    }
  }

  if (searchParams.get("from") === "ai") {
    const aiTrip = readAiHandoff();
    if (aiTrip) {
      return {
        draft: draftFromTrip(aiTrip),
        localId: null,
        createdAt: Date.now(),
        ghostNames: aiTrip.suggestedExtra,
        request: aiTrip.request,
      };
    }
  }

  // /new?city=…: a destination picked on the landing becomes stop 1.
  const startCity = startCityFromParams(searchParams);
  return {
    draft: startCity ? addCity(createBlankDraft(), startCity) : createBlankDraft(),
    localId: null,
    createdAt: Date.now(),
    ghostNames: [] as string[],
    request: undefined,
  };
}
