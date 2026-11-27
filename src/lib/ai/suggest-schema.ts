import * as z from "zod";

import { CitySchema } from "@/lib/trip";

/** What a typed destination means: a region of cities, or one city's places. */
export const SCOPES = ["region", "city"] as const;
export const PLACE_KINDS = ["city", "sight", "gem", "food", "daytrip"] as const;

export const MAX_CANDIDATES = 20;
/** Most places someone can pick for a one-city trip. */
export const MAX_PICKS = 12;

export const SuggestRequestSchema = z.object({
  destination: z.string().min(2).max(120), // same rule as GenerateRequestSchema
});
export type SuggestRequest = z.infer<typeof SuggestRequestSchema>;

export const CandidateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  kind: z.enum(PLACE_KINDS),
  ll: CitySchema.shape.ll,
});
export type Candidate = z.infer<typeof CandidateSchema>;
export type PlaceKind = Candidate["kind"];

/** A candidate the guest ticked: only what the trip generator needs. */
export const PickSchema = CandidateSchema.pick({ name: true, kind: true });
export type Pick = z.infer<typeof PickSchema>;

/** Keeps the first (highest ranked) of any names that match ignoring case. */
function dedupeByName<T extends { candidates: Candidate[] }>(data: T): T {
  const seen = new Set<string>();
  const candidates = data.candidates.filter((c) => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ...data, candidates };
}

const MIN_CANDIDATES = 3;

/** Ranked suggestions: array order is best first. */
export const SuggestionsSchema = z
  .object({
    scope: z.enum(SCOPES),
    area: CitySchema.pick({ name: true, country: true, flag: true, ll: true }),
    candidates: z.array(CandidateSchema).min(MIN_CANDIDATES).max(MAX_CANDIDATES),
  })
  .transform(dedupeByName)
  .refine((data) => data.candidates.length >= MIN_CANDIDATES, {
    message: `need at least ${MIN_CANDIDATES} distinct candidates`,
    path: ["candidates"],
  })
  .refine(
    (data) =>
      data.scope === "city" || data.candidates.every((c) => c.kind === "city"),
    { message: "a region lists only cities", path: ["candidates"] },
  );
export type Suggestions = z.infer<typeof SuggestionsSchema>;
