import { describe, expect, it } from "vitest";

import { siteVerification } from "./site-verification";

describe("siteVerification", () => {
  it("adds no tags when nothing is configured", () => {
    expect(siteVerification({ GOOGLE_SITE_VERIFICATION: " " })).toEqual({});
  });

  it("maps the Google and Bing tokens to their meta tags", () => {
    expect(
      siteVerification({
        GOOGLE_SITE_VERIFICATION: "g-token",
        BING_SITE_VERIFICATION: "b-token",
      }),
    ).toEqual({ google: "g-token", other: { "msvalidate.01": "b-token" } });
  });
});
