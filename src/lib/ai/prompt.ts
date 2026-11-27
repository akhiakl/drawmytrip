import { GUEST_MAX_CITIES } from "@/lib/trip";

import type { GenerateRequest } from "./schema";

/** JSON shape shown to the model, kept in sync with AiTripSchema. */
const TRIP_JSON_SHAPE = `{
  "title": "string, 1-80 chars, short plain route name",
  "cities": [
    {
      "name": "string ≤60", "country": "string ≤60", "flag": "emoji ≤8",
      "ll": [latitude, longitude],
      "nights": "integer 0-30",
      "why": "string ≤200, why this stop is worth visiting",
      "must": ["≤5 strings ≤60, real headline sights"],
      "gems": ["≤3 strings ≤60, real lesser-known finds"],
      "food": [["dish ≤40", "where/why ≤80"], "… ≤3 pairs"],
      "days": [["Day 1", "theme ≤40", "plan ≤150"], "… one per day of the stay, ≤10 triples"],
      "budget": [minPerDayUSD, maxPerDayUSD],
      "transport": "string ≤80, getting around this city",
      "stay": "string ≤150, neighbourhood advice",
      "tips": ["≤3 strings ≤120"]
    }
  ],
  "legs": [
    {
      "mode": "train | bus | flight | car | ferry",
      "label": "string ≤80, e.g. 'Railjet via Villach'",
      "duration": "string ≤20, e.g. '~4h 45m'"
    }
  ],
  "suggestedExtra": ["≤10 city names ≤60 that did not fit the ${GUEST_MAX_CITIES}-city limit"]
}`;

export function buildSystemPrompt(): string {
  return [
    "You are the route planner behind DrawMyTrip, a travel route map service.",
    "Respond with ONE JSON object only, with no markdown and no commentary, matching exactly this shape:",
    TRIP_JSON_SHAPE,
    "Hard rules:",
    `- Between 1 and ${GUEST_MAX_CITIES} cities. A request for a single city may stay one city. If the request implies more than ${GUEST_MAX_CITIES}, pick the best ${GUEST_MAX_CITIES} and put the remaining city names in suggestedExtra (empty array otherwise).`,
    "- Order cities in a realistic geographic route with minimal backtracking.",
    "- Use real coordinates as [latitude, longitude] with 4 decimal places.",
    "- legs.length must equal cities.length - 1; each leg connects consecutive cities with a realistic mode and duration.",
    "- Only real, verifiable attractions, restaurants and neighbourhoods. Never invent places.",
    "- Write plain, specific English like a local friend would. Never use em dashes, en dashes or semicolons in any text. Avoid marketing words such as hidden gem, vibrant, bustling, stunning or unforgettable.",
    "- budget is a US-dollar-per-day [min, max] range for a mid-range traveller.",
    "- Total nights across cities should match the requested trip length.",
    "- Be concise: stay well inside every length and count limit above, no filler.",
  ].join("\n");
}

export function buildUserPrompt(request: GenerateRequest): string {
  const pace = {
    relaxed: "relaxed: fewer stops, more nights each, unhurried days",
    balanced: "balanced: a steady mix of sightseeing and downtime",
    packed: "packed: maximise sights, faster pace, efficient days",
  }[request.vibe];

  return [
    `Destination or region: ${request.destination}`,
    `Trip length: ${request.days} days`,
    `Pace: ${pace}`,
    ...picksLines(request),
  ].join("\n");
}

/** What the guest ticked in the picker, as extra prompt lines. */
function picksLines({ destination, scope, picks }: GenerateRequest): string[] {
  if (!picks?.length) return [];
  const names = (kinds: readonly string[]) =>
    picks
      .filter((p) => kinds.includes(p.kind))
      .map((p) => p.name)
      .join(", ");

  if (scope === "region") {
    return [
      `Use exactly these cities, ordered into the best route: ${names(["city"])}.`,
    ];
  }
  const dayTrips = names(["daytrip"]);
  return [
    `Base the trip in ${destination}. Use these picked places in that city's must, gems, food and days: ${names(["sight", "gem", "food"])}.`,
    ...(dayTrips
      ? [
          `Add each of these as its own stop with nights 0, right after ${destination}: ${dayTrips}. All nights go to ${destination}.`,
        ]
      : []),
  ];
}

export function buildRetryPrompt(issues: string): string {
  return [
    "Your previous JSON failed validation with these errors:",
    issues,
    "Return the corrected JSON object only, same shape, fixing every error.",
  ].join("\n");
}
