import { NextResponse } from "next/server";

import { appendAudit } from "@/lib/audit";
import {
  AdminAuthError,
  exchangeCodeForToken,
  fetchGithubUserId,
} from "@/lib/github";
import { authLimiter, clientIp } from "@/lib/ratelimit";
import {
  SESSION_COOKIE,
  STATE_COOKIE,
  allowedGithubIds,
  createSessionToken,
  isAdminConfigured,
  sessionCookieOptions,
} from "@/lib/session";

const toSignIn = (origin: string, error = true) => {
  const response = NextResponse.redirect(
    new URL(error ? "/sign-in?error=1" : "/sign-in", origin),
  );
  response.cookies.delete({ name: STATE_COOKIE, path: "/api/auth" });
  return response;
};

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return new NextResponse("Not found", { status: 404 });
  }
  const url = new URL(request.url);
  const { success } = await authLimiter().limit(clientIp(request));
  if (!success) return new NextResponse("Too many attempts", { status: 429 });

  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const cookieState = request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((part) => part.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1);
  if (!code || !state || state !== cookieState) return toSignIn(url.origin);

  let githubId: number;
  try {
    const token = await exchangeCodeForToken(
      code,
      `${url.origin}/api/auth/callback`,
    );
    githubId = await fetchGithubUserId(token);
  } catch (error) {
    if (!(error instanceof AdminAuthError)) throw error;
    return toSignIn(url.origin);
  }

  const at = Date.now();
  if (!allowedGithubIds().has(githubId)) {
    await appendAudit({ at, actor: String(githubId), action: "sign_in_denied" });
    return toSignIn(url.origin);
  }
  await appendAudit({ at, actor: String(githubId), action: "sign_in" });
  const response = NextResponse.redirect(new URL("/", url.origin));
  response.cookies.set(
    SESSION_COOKIE,
    await createSessionToken(githubId),
    sessionCookieOptions(url.protocol === "https:"),
  );
  response.cookies.delete({ name: STATE_COOKIE, path: "/api/auth" });
  return response;
}
