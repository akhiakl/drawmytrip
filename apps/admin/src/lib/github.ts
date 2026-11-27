import "server-only";

import * as z from "zod";

export class AdminAuthError extends Error {
  constructor(readonly reason: "exchange_failed" | "user_failed") {
    super(`github sign-in failed: ${reason}`);
    this.name = "AdminAuthError";
  }
}

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";

const TokenSchema = z.object({ access_token: z.string().min(1) });
const UserSchema = z.object({ id: z.number().int().positive() });

/** No scope: the sign-in only needs the account's public id. */
export function githubAuthorizeUrl(state: string, redirectUri: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", process.env.ADMIN_GITHUB_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "false");
  return url.toString();
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.ADMIN_GITHUB_CLIENT_ID,
        client_secret: process.env.ADMIN_GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });
  } catch {
    throw new AdminAuthError("exchange_failed");
  }
  const body = response.ok
    ? TokenSchema.safeParse(await response.json().catch(() => null))
    : null;
  if (!body?.success) throw new AdminAuthError("exchange_failed");
  return body.data.access_token;
}

export async function fetchGithubUserId(accessToken: string): Promise<number> {
  let response: Response;
  try {
    response = await fetch(USER_URL, {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${accessToken}`,
        "user-agent": "drawmytrip-admin",
      },
    });
  } catch {
    throw new AdminAuthError("user_failed");
  }
  const body = response.ok
    ? UserSchema.safeParse(await response.json().catch(() => null))
    : null;
  if (!body?.success) throw new AdminAuthError("user_failed");
  return body.data.id;
}
