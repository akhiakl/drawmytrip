import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE, verifySessionToken } from "./session";

/**
 * The signed-in admin. The proxy already guards pages; actions and pages
 * call this again so no data path trusts the proxy alone.
 */
export async function requireAdmin(): Promise<{ githubId: number }> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const admin = await verifySessionToken(token);
  if (!admin) redirect("/sign-in");
  return admin;
}
