// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminEnv } from "@/test/fixtures/admin";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.get }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { requireAdmin } from "./require-admin";
import { createSessionToken } from "./session";

beforeEach(() => {
  vi.clearAllMocks();
  for (const [key, value] of Object.entries(makeAdminEnv())) {
    vi.stubEnv(key, value);
  }
});

describe("requireAdmin", () => {
  it("returns the admin for a valid session cookie", async () => {
    mocks.get.mockReturnValue({ value: await createSessionToken(31401662) });
    expect(await requireAdmin()).toEqual({ githubId: 31401662 });
  });

  it("redirects to sign-in without a valid cookie", async () => {
    mocks.get.mockReturnValue(undefined);
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/sign-in");
  });
});
