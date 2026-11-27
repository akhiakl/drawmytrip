import { describe, expect, it } from "vitest";

import { PRODUCTION_SITE_URL, siteUrl } from "./site-url";

describe("siteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    expect(
      siteUrl({
        NEXT_PUBLIC_SITE_URL: "https://grandtour.example",
        VERCEL_ENV: "preview",
        VERCEL_URL: "gt-abc.vercel.app",
        NODE_ENV: "production",
      }).origin,
    ).toBe("https://grandtour.example");
  });

  it("uses the deployment's own address on a Vercel preview", () => {
    expect(
      siteUrl({
        VERCEL_ENV: "preview",
        VERCEL_URL: "gt-abc.vercel.app",
        NODE_ENV: "production",
      }).origin,
    ).toBe("https://gt-abc.vercel.app");
  });

  it("uses the production address in a production build with no env", () => {
    expect(siteUrl({ NODE_ENV: "production" }).origin).toBe(PRODUCTION_SITE_URL);
    expect(
      siteUrl({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        VERCEL_URL: "x.vercel.app",
      }).origin,
    ).toBe(PRODUCTION_SITE_URL);
  });

  it("skips malformed values", () => {
    expect(
      siteUrl({ NEXT_PUBLIC_SITE_URL: "not a url", NODE_ENV: "production" }).origin,
    ).toBe(PRODUCTION_SITE_URL);
  });

  it("falls back to localhost outside production builds", () => {
    expect(siteUrl({ PORT: "4000" }).origin).toBe("http://localhost:4000");
    expect(siteUrl({}).origin).toBe("http://localhost:3000");
  });
});
