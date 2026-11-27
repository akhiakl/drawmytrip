import { SuggestRequestSchema } from "@/lib/ai";
import { GenerationError } from "@/lib/ai/generate";
import { suggestPlaces } from "@/lib/ai/suggest";
import { getClientIp, getRatelimiter } from "@/lib/http";
import { emit, errorFields } from "@/lib/logging";

const FAILURE_RESPONSES = {
  unavailable: { status: 503, error: "suggestions_unavailable" },
  upstream: { status: 502, error: "suggestions_failed" },
  invalid_output: { status: 502, error: "suggestions_failed" },
} as const;

// Logs the reason only: never the caller's address or the destination.
const refuse = (status: number, reason: string) => {
  emit("warn", "request refused", { route: "/api/suggest", status, reason });
  return Response.json({ error: reason }, { status });
};

export async function POST(request: Request) {
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

  try {
    return Response.json(await suggestPlaces(parsed.data));
  } catch (error) {
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
