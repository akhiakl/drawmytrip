import "server-only";

import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "dmt_admin";
export const STATE_COOKIE = "dmt_admin_state";
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

const ISSUER = "drawmytrip-admin";
const AUDIENCE = "admin";
const MIN_SECRET_LENGTH = 32;

type Env = Record<string, string | undefined>;

/** All four ADMIN_* variables set and the signing secret long enough. */
export function isAdminConfigured(env: Env = process.env): boolean {
  return Boolean(
    env.ADMIN_GITHUB_CLIENT_ID &&
    env.ADMIN_GITHUB_CLIENT_SECRET &&
    allowedGithubIds(env).size > 0 &&
    (env.ADMIN_SESSION_SECRET?.length ?? 0) >= MIN_SECRET_LENGTH,
  );
}

/** Numeric GitHub user ids from ADMIN_GITHUB_IDS; anything else is dropped. */
export function allowedGithubIds(env: Env = process.env): Set<number> {
  const ids = (env.ADMIN_GITHUB_IDS ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => /^\d+$/.test(part))
    .map(Number)
    .filter((id) => Number.isSafeInteger(id) && id > 0);
  return new Set(ids);
}

const signingKey = (env: Env) =>
  new TextEncoder().encode(env.ADMIN_SESSION_SECRET ?? "");

export async function createSessionToken(
  githubId: number,
  now = Date.now(),
  env: Env = process.env,
): Promise<string> {
  const issuedAt = Math.floor(now / 1000);
  return await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(String(githubId))
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_TTL_SECONDS)
    .sign(signingKey(env));
}

/**
 * The signed-in admin, or null: missing, tampered or expired token, wrong
 * issuer or audience, an id that is no longer allowlisted, or admin not
 * configured.
 */
export async function verifySessionToken(
  token: string | undefined,
  now = Date.now(),
  env: Env = process.env,
): Promise<{ githubId: number } | null> {
  if (!token || !isAdminConfigured(env)) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(env), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
      currentDate: new Date(now),
    });
    const githubId = Number(payload.sub);
    return allowedGithubIds(env).has(githubId) ? { githubId } : null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
