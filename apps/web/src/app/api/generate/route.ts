import { getRuntimeConfig } from "@drawmytrip/runtime-config/store";
import { after } from "next/server";

import { GenerateRequestSchema } from "@/lib/ai";
import {
  GenerationError,
  generateTrip,
  type ModelCallMeter,
} from "@/lib/ai/generate";
import { getClientIp, getRatelimiter } from "@/lib/http";
import { emit, errorFields } from "@/lib/logging";
import { dailyCapReached, recordUsage, summarizeModelCalls } from "@/lib/metering";

const FAILURE_RESPONSES = {
  unavailable: { status: 503, error: "generation_unavailable" },
  upstream: { status: 502, error: "generation_failed" },
  invalid_output: { status: 502, error: "generation_failed" },
} as const;

// Logs the reason only: never the caller's address or the prompt.
const refuse = (status: number, reason: string, error = reason) => {
  emit("warn", "request refused", { route: "/api/generate", status, reason });
  return Response.json({ error }, { status });
};

export async function POST(request: Request) {
  const config = await getRuntimeConfig();
  if (!config.ai.enabled) {
    after(() => recordUsage({ ai_refused_disabled: 1 }));
    return refuse(503, "ai_disabled", "generation_unavailable");
  }

  const { success } = await getRatelimiter("generate", config.guest.aiPerHour).limit(
    getClientIp(request),
  );
  if (!success) {
    after(() => recordUsage({ ai_refused_rate_limit: 1 }));
    return refuse(429, "rate_limited");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse(400, "invalid_json");
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) return refuse(400, "invalid_request");

  if (await dailyCapReached(config.ai.dailyCap)) {
    after(() => recordUsage({ ai_refused_disabled: 1 }));
    return refuse(503, "daily_cap", "generation_unavailable");
  }

  const calls: ModelCallMeter[] = [];
  const countUsage = (outcome: "ai_generations" | "ai_failures" | null) => {
    const { counters, gauges } = summarizeModelCalls(calls);
    after(() =>
      recordUsage({ ...counters, ...(outcome && { [outcome]: 1 }) }, gauges),
    );
  };

  try {
    // Generated trips are NOT saved — the client lands them in the editor.
    const result = await generateTrip(parsed.data, {
      onModelCall: (meter) => calls.push(meter),
    });
    emit("info", "trip generated", { route: "/api/generate" });
    countUsage("ai_generations");
    return Response.json(result);
  } catch (error) {
    countUsage(calls.length > 0 ? "ai_failures" : null);
    if (error instanceof GenerationError) {
      const { status, error: code } = FAILURE_RESPONSES[error.reason];
      emit("error", "generation failed", {
        route: "/api/generate",
        status,
        reason: error.reason,
        upstreamStatus: error.upstreamStatus,
      });
      return Response.json({ error: code }, { status });
    }
    emit("error", "generation failed", {
      route: "/api/generate",
      status: 500,
      reason: "unexpected",
      ...errorFields(error),
    });
    return Response.json({ error: "generation_failed" }, { status: 500 });
  }
}
