import { NextResponse } from "next/server";

import { githubAuthorizeUrl } from "@/lib/github";
import { authLimiter, clientIp } from "@/lib/ratelimit";
import { STATE_COOKIE, isAdminConfigured } from "@/lib/session";

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return new NextResponse("Not found", { status: 404 });
  }
  const { success } = await authLimiter().limit(clientIp(request));
  if (!success) return new NextResponse("Too many attempts", { status: 429 });

  const origin = new URL(request.url).origin;
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(
    githubAuthorizeUrl(state, `${origin}/api/auth/callback`),
  );
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 600,
  });
  return response;
}
