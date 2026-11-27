import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE,
  isAdminConfigured,
  verifySessionToken,
} from "@/lib/session";

/** Everything except sign-in, the OAuth routes, the cron and health routes. */
export const config = {
  matcher: [
    "/((?!api/auth|api/collect|api/health|sign-in|_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};

export async function proxy(request: NextRequest) {
  // An unconfigured deployment is invisible rather than half open.
  if (!isAdminConfigured()) {
    return new NextResponse("Not found", { status: 404 });
  }
  const admin = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (admin) return NextResponse.next();
  return NextResponse.redirect(new URL("/sign-in", request.url));
}
