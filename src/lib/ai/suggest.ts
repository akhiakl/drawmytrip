import "server-only";

import * as Sentry from "@sentry/nextjs";
import { Redis } from "@upstash/redis";

import { locatePlace } from "@/lib/geo-search";
import { emit } from "@/lib/logging";

import {
  callModel,
  callWithJsonRetry,
  GenerationError,
  modelConfig,
  type ChatMessage,
} from "./model";
import { buildRetryPrompt } from "./prompt";
import { buildSuggestSystemPrompt, buildSuggestUserPrompt } from "./suggest-prompt";
import {
  SuggestionsSchema,
  type PlaceKind,
  type SuggestRequest,
  type Suggestions,
} from "./suggest-schema";

/** Suggestions for a destination change slowly: cache them for 30 days. */
export const SUGGEST_TTL_SECONDS = 30 * 24 * 60 * 60;
/** A list is a ranking task, so run the model cooler than the trip draft. */
const SUGGEST_TEMPERATURE = 0.4;
const CHECK_TIMEOUT_MS = 2500;
/** Photon is a shared free service: keep the burst small. */
const CHECK_CONCURRENCY = 5;
const MIN_CHECKED = 3;

/** How far Photon's hit may sit from the model's claim, by kind. */
const RADIUS_KM: Record<PlaceKind, number> = {
  city: 75,
  sight: 15,
  gem: 15,
  food: 15,
  daytrip: 60,
};

let client: Redis | null = null;
const redis = (): Redis => (client ??= Redis.fromEnv());

const cacheKey = (destination: string) =>
  `suggest:v1:${destination.trim().toLowerCase().replace(/\s+/g, " ")}`;

async function readCache(key: string): Promise<Suggestions | null> {
  try {
    const stored = await redis().get(key);
    const parsed = SuggestionsSchema.safeParse(stored);
    return parsed.success ? parsed.data : null;
  } catch {
    emit("warn", "suggest cache unavailable", { route: "/api/suggest", op: "get" });
    return null;
  }
}

async function writeCache(key: string, value: Suggestions): Promise<void> {
  try {
    await redis().set(key, value, { ex: SUGGEST_TTL_SECONDS });
  } catch {
    emit("warn", "suggest cache unavailable", { route: "/api/suggest", op: "set" });
  }
}

function parse(content: string): { suggestions: Suggestions } | { issues: string } {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    return { issues: "output was not valid JSON" };
  }
  const parsed = SuggestionsSchema.safeParse(json);
  if (parsed.success) return { suggestions: parsed.data };
  return {
    issues: parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n"),
  };
}

async function draft(
  request: SuggestRequest,
  call: (messages: ChatMessage[]) => Promise<string>,
): Promise<Suggestions> {
  const base: ChatMessage[] = [
    { role: "system", content: buildSuggestSystemPrompt() },
    { role: "user", content: buildSuggestUserPrompt(request) },
  ];
  const first = await callWithJsonRetry(call, base);
  const firstResult = parse(first);
  if ("suggestions" in firstResult) return firstResult.suggestions;
  emit("warn", "suggestions rejected, retrying", {
    route: "/api/suggest",
    issues: firstResult.issues.slice(0, 300),
  });

  const second = await call([
    ...base,
    { role: "assistant", content: first },
    { role: "user", content: buildRetryPrompt(firstResult.issues) },
  ]);
  const secondResult = parse(second);
  if ("suggestions" in secondResult) return secondResult.suggestions;
  emit("error", "suggestions rejected twice", {
    route: "/api/suggest",
    issues: secondResult.issues.slice(0, 300),
  });
  throw new GenerationError("invalid_output");
}

/**
 * Looks every candidate up in Photon: real coordinates replace the model's,
 * and places that can't be found are dropped (cities keep the model's
 * point, since the trip generator places them anyway). `checked` is false
 * when the check ran out of time or left too little to offer, so the
 * caller serves the model's list without caching it.
 * shortcut: Photon errors read as "not found", upgrade if its outages show up in logs.
 */
async function checkPlaces(
  suggestions: Suggestions,
): Promise<{ suggestions: Suggestions; checked: boolean }> {
  const signal = AbortSignal.timeout(CHECK_TIMEOUT_MS);
  const { candidates } = suggestions;
  const located = new Array<Awaited<ReturnType<typeof locatePlace>>>(
    candidates.length,
  );
  let next = 0;

  const worker = async () => {
    while (next < candidates.length && !signal.aborted) {
      const index = next++;
      const { name, ll, kind } = candidates[index];
      located[index] = await locatePlace(
        { name, ll, radiusKm: RADIUS_KM[kind], settlement: kind === "city" },
        { signal },
      );
    }
  };
  await Promise.all(Array.from({ length: CHECK_CONCURRENCY }, worker));
  if (signal.aborted) return { suggestions, checked: false };

  const kept = candidates.flatMap((candidate, i) => {
    const found = located[i];
    if (found) return [{ ...candidate, ll: found }];
    return candidate.kind === "city" ? [candidate] : [];
  });
  if (kept.length < MIN_CHECKED) return { suggestions, checked: false };
  return { suggestions: { ...suggestions, candidates: kept }, checked: true };
}

/**
 * Ranked places for a typed destination: a region gives cities to choose
 * from, one city gives its sights, finds, food and day trips. Cached per
 * destination. Traced as one span whose attributes are a fixed allowlist
 * (never the destination).
 */
export async function suggestPlaces(request: SuggestRequest): Promise<Suggestions> {
  const config = modelConfig();
  if (!config) throw new GenerationError("unavailable");

  return await Sentry.startSpan(
    {
      name: "ai.suggest",
      op: "gen_ai.generate",
      attributes: { "ai.model": config.model },
    },
    async (span) => {
      const key = cacheKey(request.destination);
      const cached = await readCache(key);
      span.setAttribute("suggest.cache_hit", cached !== null);
      if (cached) {
        span.setAttribute("suggest.scope", cached.scope);
        span.setAttribute("suggest.candidates", cached.candidates.length);
        return cached;
      }

      let attempts = 0;
      const call = (messages: ChatMessage[]) =>
        callModel(messages, config, ++attempts, SUGGEST_TEMPERATURE);
      const drafted = await draft(request, call);
      const { suggestions, checked } = await checkPlaces(drafted);

      span.setAttribute("suggest.scope", suggestions.scope);
      span.setAttribute("suggest.candidates", suggestions.candidates.length);
      span.setAttribute("suggest.checked", checked);
      if (checked) await writeCache(key, suggestions);
      return suggestions;
    },
  );
}
