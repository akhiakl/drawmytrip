import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AdminAuthError,
  exchangeCodeForToken,
  fetchGithubUserId,
  githubAuthorizeUrl,
} from "./github";

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("ADMIN_GITHUB_CLIENT_ID", "client-id");
  vi.stubEnv("ADMIN_GITHUB_CLIENT_SECRET", "client-secret");
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("githubAuthorizeUrl", () => {
  it("asks for no scope and refuses sign-ups", () => {
    const url = new URL(
      githubAuthorizeUrl("state-1", "https://admin.test/api/auth/callback"),
    );
    expect(url.origin + url.pathname).toBe(
      "https://github.com/login/oauth/authorize",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "client-id",
      redirect_uri: "https://admin.test/api/auth/callback",
      state: "state-1",
      allow_signup: "false",
    });
  });
});

describe("exchangeCodeForToken", () => {
  it("posts the code and returns the access token", async () => {
    fetchMock.mockResolvedValue(json({ access_token: "gho_abc" }));
    expect(await exchangeCodeForToken("code-1", "https://admin.test/cb")).toBe(
      "gho_abc",
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://github.com/login/oauth/access_token");
    expect(init.headers.accept).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({
      client_id: "client-id",
      client_secret: "client-secret",
      code: "code-1",
      redirect_uri: "https://admin.test/cb",
    });
  });

  it.each([
    ["a non-2xx answer", () => json({ access_token: "x" }, 500)],
    ["a body without a token", () => json({ error: "bad_verification_code" })],
    ["a body that is not JSON", () => new Response("<html>")],
  ])("fails on %s", async (_name, respond) => {
    fetchMock.mockResolvedValue(respond());
    await expect(exchangeCodeForToken("c", "r")).rejects.toMatchObject({
      name: "AdminAuthError",
      reason: "exchange_failed",
    });
  });

  it("fails when the network does", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await expect(exchangeCodeForToken("c", "r")).rejects.toBeInstanceOf(
      AdminAuthError,
    );
  });
});

describe("fetchGithubUserId", () => {
  it("returns the numeric account id", async () => {
    fetchMock.mockResolvedValue(json({ id: 31401662, login: "someone" }));
    expect(await fetchGithubUserId("gho_abc")).toBe(31401662);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.github.com/user");
    expect(init.headers.authorization).toBe("Bearer gho_abc");
    expect(init.headers["user-agent"]).toBe("drawmytrip-admin");
  });

  it.each([
    ["a non-2xx answer", () => json({ id: 1 }, 401)],
    ["an id that is not a positive integer", () => json({ id: "1" })],
    ["a body that is not JSON", () => new Response("nope")],
  ])("fails on %s", async (_name, respond) => {
    fetchMock.mockResolvedValue(respond());
    await expect(fetchGithubUserId("t")).rejects.toMatchObject({
      reason: "user_failed",
    });
  });

  it("fails when the network does", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await expect(fetchGithubUserId("t")).rejects.toMatchObject({
      reason: "user_failed",
    });
  });
});
