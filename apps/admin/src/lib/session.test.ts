// @vitest-environment node
import { describe, expect, it } from "vitest";

import { makeAdminEnv } from "@/test/fixtures/admin";

import {
  SESSION_TTL_SECONDS,
  allowedGithubIds,
  createSessionToken,
  isAdminConfigured,
  sessionCookieOptions,
  verifySessionToken,
} from "./session";

const env = makeAdminEnv();
const NOW = Date.parse("2026-11-27T10:00:00Z");

describe("isAdminConfigured", () => {
  it("needs all four variables", () => {
    expect(isAdminConfigured(env)).toBe(true);
    for (const key of Object.keys(env)) {
      expect(isAdminConfigured(makeAdminEnv({ [key]: undefined }))).toBe(false);
    }
  });

  it("rejects a short signing secret", () => {
    expect(isAdminConfigured(makeAdminEnv({ ADMIN_SESSION_SECRET: "short" }))).toBe(
      false,
    );
  });

  it("rejects an allowlist with no valid id", () => {
    expect(isAdminConfigured(makeAdminEnv({ ADMIN_GITHUB_IDS: "abc, ,-3" }))).toBe(
      false,
    );
  });
});

describe("allowedGithubIds", () => {
  it("parses a comma list and drops anything not a positive whole number", () => {
    const ids = allowedGithubIds(
      makeAdminEnv({ ADMIN_GITHUB_IDS: " 12, x ,0,3.5, 99 " }),
    );
    expect([...ids]).toEqual([12, 99]);
  });

  it("is empty when unset", () => {
    expect(allowedGithubIds({}).size).toBe(0);
  });
});

describe("session token", () => {
  it("round-trips an allowlisted id", async () => {
    const token = await createSessionToken(31401662, NOW, env);
    expect(await verifySessionToken(token, NOW + 1000, env)).toEqual({
      githubId: 31401662,
    });
  });

  it("expires after 12 hours", async () => {
    const token = await createSessionToken(31401662, NOW, env);
    expect(
      await verifySessionToken(token, NOW + (SESSION_TTL_SECONDS - 5) * 1000, env),
    ).not.toBeNull();
    expect(
      await verifySessionToken(token, NOW + (SESSION_TTL_SECONDS + 5) * 1000, env),
    ).toBeNull();
  });

  it("rejects a tampered token and one signed with another secret", async () => {
    const token = await createSessionToken(31401662, NOW, env);
    const [head, body, signature] = token.split(".");
    expect(
      await verifySessionToken(`${head}.${body}.${signature}x`, NOW, env),
    ).toBeNull();
    const other = await createSessionToken(
      31401662,
      NOW,
      makeAdminEnv({ ADMIN_SESSION_SECRET: "o".repeat(32) }),
    );
    expect(await verifySessionToken(other, NOW, env)).toBeNull();
  });

  it("rejects an id removed from the allowlist", async () => {
    const token = await createSessionToken(31401662, NOW, env);
    const narrowed = makeAdminEnv({ ADMIN_GITHUB_IDS: "7" });
    expect(await verifySessionToken(token, NOW, narrowed)).toBeNull();
  });

  it("rejects garbage, a missing token and an unconfigured admin", async () => {
    expect(await verifySessionToken("not-a-jwt", NOW, env)).toBeNull();
    expect(await verifySessionToken(undefined, NOW, env)).toBeNull();
    const token = await createSessionToken(31401662, NOW, env);
    expect(
      await verifySessionToken(token, NOW, makeAdminEnv({ ADMIN_GITHUB_IDS: "" })),
    ).toBeNull();
  });

  it("uses the process env by default", async () => {
    const token = await createSessionToken(
      5,
      NOW,
      makeAdminEnv({ ADMIN_GITHUB_IDS: "5" }),
    );
    expect(await verifySessionToken(token, NOW)).toBeNull();
  });
});

describe("sessionCookieOptions", () => {
  it("is httpOnly, lax, site-wide and 12 hours; secure follows the request", () => {
    expect(sessionCookieOptions(true)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 43200,
    });
    expect(sessionCookieOptions(false).secure).toBe(false);
  });
});
