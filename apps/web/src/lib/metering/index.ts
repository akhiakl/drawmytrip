import "server-only";

import type { CounterMetric, GaugeMetric } from "@drawmytrip/usage";
import { readUsage, recordUsage } from "@drawmytrip/usage/record";

import type { ModelCallMeter } from "@/lib/ai/generate";

/**
 * Daily usage counters for the admin app: what the public routes record on
 * the way through. Server-only; route handlers call these inside `after()`.
 */
export { recordUsage };

export interface ModelUsage {
  counters: Partial<Record<CounterMetric, number>>;
  gauges: Partial<Record<GaugeMetric, number>>;
}

/** Totals for the HTTP responses one request got from the model endpoint. */
export function summarizeModelCalls(calls: readonly ModelCallMeter[]): ModelUsage {
  const counters: ModelUsage["counters"] = {
    ai_model_calls: calls.length,
    ai_prompt_tokens: calls.reduce((sum, call) => sum + call.promptTokens, 0),
    ai_completion_tokens: calls.reduce(
      (sum, call) => sum + call.completionTokens,
      0,
    ),
    ai_provider_429: calls.filter((call) => call.status === 429).length,
  };
  const gauges: ModelUsage["gauges"] = {};
  for (const call of calls) {
    if (call.rpdLimit !== undefined) gauges.ai_rpd_limit = call.rpdLimit;
    if (call.rpdRemaining !== undefined) gauges.ai_rpd_remaining = call.rpdRemaining;
  }
  return { counters, gauges };
}

/**
 * Whether today's AI plans reached the admin's daily cap (0 = no cap).
 * Fails open: a counter read error must not switch the planner off.
 */
export async function dailyCapReached(cap: number): Promise<boolean> {
  if (cap <= 0) return false;
  try {
    const [today] = await readUsage(1);
    return today.ai_generations >= cap;
  } catch {
    return false;
  }
}
