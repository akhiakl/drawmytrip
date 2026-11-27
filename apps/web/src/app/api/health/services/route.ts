import { timingSafeEqual } from "node:crypto";

import { MAP_STYLE } from "@/components/trip/map-style";
import { checkSiteServices } from "@/lib/health";
import { pingStore } from "@/lib/trip/service";

export const dynamic = "force-dynamic";

const safeEqual = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Per-service health for the admin console, which sends
 * `Authorization: Bearer $HEALTH_CHECK_SECRET`. Without the secret set the
 * route does not exist (404); a wrong token is 401. Never cached: each call
 * is a fresh check, and the body holds only service ids, statuses,
 * latencies and fixed failure codes.
 */
export async function GET(request: Request) {
  const secret = process.env.HEALTH_CHECK_SECRET;
  if (!secret) return Response.json({ error: "not_found" }, { status: 404 });
  const given = request.headers.get("authorization") ?? "";
  if (!safeEqual(given, `Bearer ${secret}`)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const report = await checkSiteServices({
    env: process.env,
    pingStore,
    mapStyleUrl: MAP_STYLE.url,
  });
  return Response.json(report, { headers: { "Cache-Control": "no-store" } });
}
