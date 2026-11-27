import { getRuntimeConfig } from "@drawmytrip/runtime-config/store";
import { after } from "next/server";

import { SuggestRequestSchema } from "@/lib/ai";
import { GenerationError, type ModelCallMeter } from "@/lib/ai/generate";
import { suggestPlaces } from "@/lib/ai/suggest";
import { getClientIp, getRatelimiter } from "@/lib/http";
import { emit, errorFields } from "@/lib/logging";
import { recordUsage, summarizeModelCalls } from "@/lib/metering";

const FAILURE_RESPONSES = {
  unavailable: { status: 503, error: "suggestions_unavailable" },
  upstream: { status: 502, error: "suggestions_failed" },
  invalid_output: { status: 502, error: "suggestions_failed" },
} as const;

// Logs the reason only: never the caller's address or the destination.
const refuse = (status: number, reason: string, error = reason) => {
  emit("warn", "request refused", { route: "/api/suggest", status, reason });
  return Response.json({ error }, { status });
};

export async function POST(request: Request) {
  const config = await getRuntimeConfig();
  if (!config.ai.enabled) {
    after(() => recordUsage({ ai_refused_disabled: 1 }));
    return refuse(503, "ai_disabled", "suggestions_unavailable");
  }

  const { success } = await getRatelimiter("suggest").limit(getClientIp(request));
  if (!success) return refuse(429, "rate_limited");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse(400, "invalid_json");
  }

  const parsed = SuggestRequestSchema.safeParse(body);
  if (!parsed.success) return refuse(400, "invalid_request");

  const calls: ModelCallMeter[] = [];
  const countUsage = () => {
    const { counters, gauges } = summarizeModelCalls(calls);
    after(() => recordUsage(counters, gauges));
  };

  try {
    const suggestions = await suggestPlaces(parsed.data, {
      onModelCall: (meter) => calls.push(meter),
    });
    countUsage();
    return Response.json(suggestions);
  } catch (error) {
    countUsage();
    if (error instanceof GenerationError) {
      const { status, error: code } = FAILURE_RESPONSES[error.reason];
      emit("error", "suggestions failed", {
        route: "/api/suggest",
        status,
        reason: error.reason,
        upstreamStatus: error.upstreamStatus,
      });
      return Response.json({ error: code }, { status });
    }
    emit("error", "suggestions failed", {
      route: "/api/suggest",
      status: 500,
      reason: "unexpected",
      ...errorFields(error),
    });
    return Response.json({ error: "suggestions_failed" }, { status: 500 });
  }
}
