import "server-only";

import * as Sentry from "@sentry/nextjs";

import { emit, errorFields } from "@/lib/logging";

export type GenerationFailure = "unavailable" | "upstream" | "invalid_output";

export class GenerationError extends Error {
  constructor(
    public readonly reason: GenerationFailure,
    /** HTTP status the model endpoint answered with, when it did. */
    public readonly upstreamStatus?: number,
    /** The provider's short error code, when it sent one. */
    public readonly upstreamCode?: string,
  ) {
    super(`trip generation failed: ${reason}`);
    this.name = "GenerationError";
  }
}

const DEFAULT_TEMPERATURE = 0.6;

/** What one HTTP response from the model endpoint cost; feeds the admin's usage charts. */
export interface ModelCallMeter {
  status: number;
  promptTokens: number;
  completionTokens: number;
  /** `x-ratelimit-limit-requests`: the provider's daily request limit. */
  rpdLimit?: number;
  /** `x-ratelimit-remaining-requests`: requests left today. */
  rpdRemaining?: number;
}

export type OnModelCall = (meter: ModelCallMeter) => void;

function headerInt(response: Response, name: string): number | undefined {
  const raw = response.headers.get(name);
  if (raw === null || !/^\d+$/.test(raw.trim())) return undefined;
  return Number(raw);
}

function tokenCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

/** Reports one response; a throwing callback must never break the call. */
function report(
  onModelCall: OnModelCall | undefined,
  response: Response,
  usage?: { prompt_tokens?: unknown; completion_tokens?: unknown },
): void {
  if (!onModelCall) return;
  const meter: ModelCallMeter = {
    status: response.status,
    promptTokens: tokenCount(usage?.prompt_tokens),
    completionTokens: tokenCount(usage?.completion_tokens),
    rpdLimit: headerInt(response, "x-ratelimit-limit-requests"),
    rpdRemaining: headerInt(response, "x-ratelimit-remaining-requests"),
  };
  try {
    onModelCall(meter);
  } catch {
    // Metering is best effort.
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Any OpenAI-compatible chat endpoint (Ollama, vLLM, llama.cpp, ...). */
export interface ModelConfig {
  url: string;
  model: string;
  apiKey?: string;
  /** Optional, sent only when set: not every provider accepts them. */
  reasoningEffort?: string;
  maxTokens?: number;
}

function positiveInt(value: string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function modelConfig(): ModelConfig | null {
  const baseUrl = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL;
  if (!baseUrl || !model) return null;
  return {
    url: `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
    model,
    apiKey: process.env.AI_API_KEY || undefined,
    reasoningEffort: process.env.AI_REASONING_EFFORT || undefined,
    maxTokens: positiveInt(process.env.AI_MAX_TOKENS),
  };
}

export async function callModel(
  messages: ChatMessage[],
  config: ModelConfig,
  attempt: number,
  temperature = DEFAULT_TEMPERATURE,
  onModelCall?: OnModelCall,
): Promise<string> {
  return await Sentry.startSpan(
    {
      name: "ai.chat_completion",
      op: "gen_ai.chat",
      attributes: { "ai.attempt": attempt },
    },
    () => requestCompletion(messages, config, temperature, onModelCall),
  );
}

async function requestCompletion(
  messages: ChatMessage[],
  config: ModelConfig,
  temperature: number,
  onModelCall?: OnModelCall,
): Promise<string> {
  const startedAt = Date.now();
  const fail = (
    detail: string,
    upstreamStatus?: number,
    error?: unknown,
    upstreamCode?: string,
  ) => {
    emit("error", "model call failed", {
      route: "/api/generate",
      model: config.model,
      detail,
      upstreamCode,
      upstreamStatus,
      durationMs: Date.now() - startedAt,
      ...(error === undefined ? {} : errorFields(error)),
    });
    return new GenerationError("upstream", upstreamStatus, upstreamCode);
  };

  let response: Response;
  try {
    response = await fetch(config.url, {
      method: "POST",
      headers: {
        ...(config.apiKey && { authorization: `Bearer ${config.apiKey}` }),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        response_format: { type: "json_object" },
        temperature,
        ...(config.reasoningEffort && { reasoning_effort: config.reasoningEffort }),
        ...(config.maxTokens && { max_completion_tokens: config.maxTokens }),
        messages,
      }),
    });
  } catch (error) {
    throw fail("network", undefined, error);
  }

  if (!response.ok) {
    report(onModelCall, response);
    throw fail("http_status", response.status, undefined, await errorCode(response));
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    report(onModelCall, response);
    throw fail("body_not_json", response.status, error);
  }
  report(
    onModelCall,
    response,
    (data as { usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } })
      .usage,
  );
  const content = (data as { choices?: { message?: { content?: unknown } }[] })
    .choices?.[0]?.message?.content;

  if (typeof content !== "string") throw fail("no_content", response.status);
  return content;
}

/** The provider's short error code (e.g. json_validate_failed), never its message. */
async function errorCode(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { error?: { code?: unknown } };
    const code = body.error?.code;
    return typeof code === "string" ? code.slice(0, 60) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Groq rejects a reply it can't parse as JSON with a 400 instead of returning
 * it. The model is non-deterministic, so one more identical call usually works.
 */
export async function callWithJsonRetry(
  call: (messages: ChatMessage[]) => Promise<string>,
  messages: ChatMessage[],
): Promise<string> {
  try {
    return await call(messages);
  } catch (error) {
    if (
      error instanceof GenerationError &&
      error.upstreamCode === "json_validate_failed"
    ) {
      return await call(messages);
    }
    throw error;
  }
}
