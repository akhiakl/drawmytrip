import type { Candidate, Pick, Suggestions } from "@/lib/ai";

/** Builders for suggest-flow payloads shared across unit tests. */

export const makeCandidate = (overrides: Partial<Candidate> = {}): Candidate => ({
  name: "CN Tower",
  kind: "sight",
  ll: [43.6426, -79.3871],
  ...overrides,
});

export const makePick = (overrides: Partial<Pick> = {}): Pick => ({
  name: "CN Tower",
  kind: "sight",
  ...overrides,
});

const CITY_CANDIDATES: Candidate[] = [
  makeCandidate({ name: "CN Tower" }),
  makeCandidate({ name: "Royal Ontario Museum", ll: [43.6677, -79.3948] }),
  makeCandidate({
    name: "Distillery District",
    kind: "gem",
    ll: [43.6503, -79.3596],
  }),
  makeCandidate({
    name: "Kensington Market",
    kind: "food",
    ll: [43.6547, -79.4005],
  }),
  makeCandidate({ name: "Niagara Falls", kind: "daytrip", ll: [43.0896, -79.0849] }),
];

const REGION_CANDIDATES: Candidate[] = [
  makeCandidate({ name: "Vienna", kind: "city", ll: [48.2082, 16.3738] }),
  makeCandidate({ name: "Salzburg", kind: "city", ll: [47.8095, 13.055] }),
  makeCandidate({ name: "Innsbruck", kind: "city", ll: [47.2692, 11.4041] }),
  makeCandidate({ name: "Graz", kind: "city", ll: [47.0707, 15.4395] }),
];

export const makeSuggestions = (
  scope: Suggestions["scope"] = "city",
  overrides: Partial<Suggestions> = {},
): Suggestions =>
  scope === "city"
    ? {
        scope,
        area: {
          name: "Toronto",
          country: "Canada",
          flag: "🇨🇦",
          ll: [43.6532, -79.3832],
        },
        candidates: CITY_CANDIDATES,
        ...overrides,
      }
    : {
        scope,
        area: {
          name: "Austria",
          country: "Austria",
          flag: "🇦🇹",
          ll: [47.5162, 14.5501],
        },
        candidates: REGION_CANDIDATES,
        ...overrides,
      };
