import type { AiTrip, GenerateRequest } from "@/lib/ai";
import type { ModelCallMeter } from "@/lib/ai/generate";

import { makeCity, makeLeg, makeRouteCities, makeTrip } from "./trip";

/** Builders for AI-generation inputs/outputs shared across unit tests. */

export const makeGenerateRequest = (
  overrides: Partial<GenerateRequest> = {},
): GenerateRequest => ({
  destination: "Austria",
  days: 6,
  vibe: "balanced",
  ...overrides,
});

export const makeAiTrip = (
  cityCount = 2,
  overrides: Partial<AiTrip> = {},
): AiTrip => ({
  title: "Alpine Arc",
  cities: Array.from({ length: cityCount }, (_, i) =>
    makeCity(i === 0 ? {} : { name: `Stop ${i + 1}` }),
  ),
  legs: Array.from({ length: cityCount - 1 }, () => makeLeg()),
  suggestedExtra: [],
  ...overrides,
});

/** `/api/generate` success body: a full Trip plus overflow ghost names. */
export const makeGeneratedDraft = (
  suggestedExtra: string[] = ["Ljubljana"],
  cityCount = 2,
) => ({
  trip: makeTrip(cityCount, {
    title: "Alpine Arc",
    cities: makeRouteCities(cityCount),
  }),
  suggestedExtra,
});

/** One metered HTTP response from the model endpoint. */
export const makeModelCallMeter = (
  overrides: Partial<ModelCallMeter> = {},
): ModelCallMeter => ({
  status: 200,
  promptTokens: 120,
  completionTokens: 80,
  ...overrides,
});
