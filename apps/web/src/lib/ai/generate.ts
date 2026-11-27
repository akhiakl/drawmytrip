import "server-only";

import * as Sentry from "@sentry/nextjs";

import { emit } from "@/lib/logging";
import { TripSchema, type Trip } from "@/lib/trip";

import {
  callModel,
  callWithJsonRetry,
  GenerationError,
  modelConfig,
  type ChatMessage,
  type OnModelCall,
} from "./model";
import { buildRetryPrompt, buildSystemPrompt, buildUserPrompt } from "./prompt";
import { AiTripSchema, clampToGuestLimit, type GenerateRequest } from "./schema";

export {
  GenerationError,
  type GenerationFailure,
  type ModelCallMeter,
} from "./model";

export interface GeneratedTrip {
  trip: Trip;
  /** City names beyond the guest limit — feeds the ghost-stop upsell. */
  suggestedExtra: string[];
}

function tryParse(content: string): { trip: GeneratedTrip } | { issues: string } {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    return { issues: "output was not valid JSON" };
  }

  const parsed = AiTripSchema.safeParse(clampToGuestLimit(json));
  if (!parsed.success) {
    return {
      issues: parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n"),
    };
  }

  const { suggestedExtra, ...aiTrip } = parsed.data;
  const trip = TripSchema.parse({
    v: 1,
    ...aiTrip,
    createdBy: "guest",
    createdAt: Date.now(),
  });
  return { trip: { trip, suggestedExtra } };
}

/**
 * One generation call, one retry with validation errors fed back.
 * Throws GenerationError; never returns a partially valid trip.
 * Traced as one span; its attributes are a fixed allowlist with no guest
 * content (destination, prompts and model output stay out of Sentry).
 */
export async function generateTrip(
  request: GenerateRequest,
  options: { onModelCall?: OnModelCall } = {},
): Promise<GeneratedTrip> {
  const config = modelConfig();
  if (!config) throw new GenerationError("unavailable");

  return await Sentry.startSpan(
    {
      name: "ai.generate_trip",
      op: "gen_ai.generate",
      attributes: { "ai.model": config.model, "trip.days": request.days },
    },
    async (span) => {
      let attempts = 0;
      const call = (messages: ChatMessage[]) =>
        callModel(messages, config, ++attempts, undefined, options.onModelCall);
      try {
        const result = await draftWithRetry(request, call);
        span.setAttribute("ai.outcome", "ok");
        span.setAttribute("trip.cities", result.trip.cities.length);
        return result;
      } catch (error) {
        span.setAttribute(
          "ai.outcome",
          error instanceof GenerationError ? error.reason : "error",
        );
        throw error;
      } finally {
        span.setAttribute("ai.attempts", attempts);
      }
    },
  );
}

async function draftWithRetry(
  request: GenerateRequest,
  call: (messages: ChatMessage[]) => Promise<string>,
): Promise<GeneratedTrip> {
  const base: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: buildUserPrompt(request) },
  ];

  const first = await callWithJsonRetry(call, base);
  const firstResult = tryParse(first);
  if ("trip" in firstResult) return firstResult.trip;
  // Issue paths and messages come from our schema, never the model's text.
  emit("warn", "model output rejected, retrying", {
    route: "/api/generate",
    issues: firstResult.issues.slice(0, 300),
  });

  const second = await call([
    ...base,
    { role: "assistant", content: first },
    { role: "user", content: buildRetryPrompt(firstResult.issues) },
  ]);
  const secondResult = tryParse(second);
  if ("trip" in secondResult) return secondResult.trip;

  emit("error", "model output rejected twice", {
    route: "/api/generate",
    issues: secondResult.issues.slice(0, 300),
  });
  throw new GenerationError("invalid_output");
}
