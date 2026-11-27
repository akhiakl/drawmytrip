import { MAX_CANDIDATES, type SuggestRequest } from "./suggest-schema";

/** JSON shape shown to the model, kept in sync with SuggestionsSchema. */
const SUGGEST_JSON_SHAPE = `{
  "scope": "region | city",
  "area": {
    "name": "string ≤60, the destination itself",
    "country": "string ≤60", "flag": "emoji ≤8",
    "ll": [latitude, longitude]
  },
  "candidates": [
    {
      "name": "string ≤60, the place's common name",
      "kind": "city | sight | gem | food | daytrip",
      "ll": [latitude, longitude]
    }
  ]
}`;

export function buildSuggestSystemPrompt(): string {
  return [
    "You are the place suggester behind DrawMyTrip, a travel route map service.",
    "Respond with ONE JSON object only, with no markdown and no commentary, matching exactly this shape:",
    SUGGEST_JSON_SHAPE,
    "Hard rules:",
    "- scope is city when the input names one city or town (with or without its country). Otherwise scope is region: a country, state, coast, island group, continent or several cities.",
    "- Region: 8 to 12 candidates, all kind city, spread across the region and ranked best first for a first visit.",
    `- City: 15 to ${MAX_CANDIDATES} candidates ranked best first within each kind: about 8 sight (headline sights), 4 gem (lesser known finds), 4 food (markets, food streets, neighbourhoods to eat in) and 2 to 4 daytrip (towns or sights under about 2.5 hours away).`,
    "- Never list the destination itself as a candidate. Never repeat a place.",
    "- Use real coordinates as [latitude, longitude] with 4 decimal places.",
    "- Only real, verifiable places. Never invent places.",
    "- Use the name a traveller would search for, plain English, no em dashes, en dashes or semicolons.",
  ].join("\n");
}

export function buildSuggestUserPrompt({ destination }: SuggestRequest): string {
  return `Destination: ${destination}`;
}
