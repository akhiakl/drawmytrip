import { timingSafeEqual } from "node:crypto";

import { collectAll } from "@/lib/collect";

export const maxDuration = 60;

const safeEqual = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Vercel cron: `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(given, `Bearer ${secret}`)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const statuses = await collectAll(process.env);
  return Response.json({ ok: true, statuses });
}
